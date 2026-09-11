/**
 * Pose → bird Y for Squat Flappy.
 *
 * This is NOT torso-Y push-up mapping.
 *
 * Calibrate holding a ~90° air squat (thighs parallel) as bird UP.
 * Standing tall = dive (bird down).
 *
 * Signal: real in-frame hips when they sit below the shoulders; otherwise
 * shoulder Y (then nose). Chest-height laptop cams often crop hips —
 * MediaPipe still emits them with Y pinned near the bottom, so we ignore
 * those guesses and follow the shoulders.
 *
 * Chest-height polarity: larger MediaPipe Y = body lower = deeper squat =
 * bird UP. Invert only when a true below-hip camera is confirmed from a
 * real stand vs squat (knee angle). After Start, the observed min/max of
 * the chosen torso signal is the mapping range so an 8–15% shoulder drop
 * is enough travel.
 */

import {
  CALIB_HOLD_MS,
  CALIB_MAX_STD,
  CALIB_UP_BIRD_FRAC,
  DEFAULT_STAND_OFFSET,
  EMA_ALPHA,
  HIP_BLEND_WEIGHT,
  HIP_CROP_Y,
  HIP_RELIABLE_VISIBILITY,
  KNEE_VISIBILITY,
  LM,
  MIN_LEARNED_RANGE,
  MIN_VISIBILITY,
  SQUAT_ANGLE_DEG,
  STAND_ANGLE_DEG,
} from "./constants";

export type Landmark = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
};

export type CalibPhase = "waiting" | "holding" | "set";

export type PoseSource = "blend" | "hip" | "shoulder" | "none";

export type SquatSignals = {
  hipY: number | null;
  kneeAngle: number | null;
  kneesVisible: boolean;
  source: PoseSource;
};

export type PoseSample = {
  hipY: number;
  kneeAngle: number | null;
  kneesVisible: boolean;
  source: PoseSource;
  /** EMA-smoothed squat depth: 1 = squat / bird up, 0 = stand / bird down */
  squatDepth: number;
  hasPose: boolean;
  reps: number;
  calibPhase: CalibPhase;
  holdProgress: number;
  squatHipY: number | null;
  /**
   * 0 = calibrated squat (bird near top), 1 = standing tall (bird down).
   * Uncalibrated falls back to inverted raw squat depth.
   */
  mappedNorm: number;
  /** True when hip polarity was flipped after observing stand vs squat */
  hipInverted: boolean;
};

export function visible(
  lm: Landmark | undefined,
  threshold = MIN_VISIBILITY
): boolean {
  if (!lm) return false;
  return (lm.visibility ?? 1) >= threshold;
}

function meanY(points: Landmark[]): number {
  return points.reduce((sum, p) => sum + p.y, 0) / points.length;
}

function meanVisibleY(
  landmarks: Landmark[],
  indices: readonly number[]
): number | null {
  const pts: Landmark[] = [];
  for (const i of indices) {
    const p = landmarks[i];
    if (visible(p)) pts.push(p);
  }
  if (pts.length === 0) return null;
  return meanY(pts);
}

/** Average visible hip Y in [0,1] (MediaPipe: larger = lower in frame). */
export function hipHeight(landmarks: Landmark[]): number | null {
  return meanVisibleY(landmarks, [LM.LEFT_HIP, LM.RIGHT_HIP]);
}

/** Average visible shoulder Y — rises/falls with a squat when hips are cropped. */
export function shoulderHeight(landmarks: Landmark[]): number | null {
  return meanVisibleY(landmarks, [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER]);
}

export function noseHeight(landmarks: Landmark[]): number | null {
  const n = landmarks[LM.NOSE];
  if (!visible(n)) return null;
  return n.y;
}

/**
 * Hip Y only when the hips look in-frame — below the shoulders, not a
 * cropped MediaPipe guess pinned to the bottom with mediocre visibility.
 */
export function usableHipHeight(landmarks: Landmark[]): number | null {
  const hips: Landmark[] = [];
  const lh = landmarks[LM.LEFT_HIP];
  const rh = landmarks[LM.RIGHT_HIP];
  if (visible(lh)) hips.push(lh);
  if (visible(rh)) hips.push(rh);
  if (hips.length === 0) return null;

  const hipY = meanY(hips);
  const hipVis = Math.min(...hips.map((h) => h.visibility ?? 1));
  const shouldersY = shoulderHeight(landmarks);

  if (shouldersY != null) {
    if (hipY <= shouldersY) return null;
    if (hipY >= HIP_CROP_Y && hipVis < HIP_RELIABLE_VISIBILITY) return null;
  }
  return hipY;
}

/** Prefer real in-frame hips; else shoulders; else nose. */
export function torsoHeight(landmarks: Landmark[]): number | null {
  return (
    usableHipHeight(landmarks) ??
    shoulderHeight(landmarks) ??
    noseHeight(landmarks)
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Interior angle at B in degrees for points A–B–C. */
export function angleDeg(
  a: Pick<Landmark, "x" | "y">,
  b: Pick<Landmark, "x" | "y">,
  c: Pick<Landmark, "x" | "y">
): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (mag < 1e-6) return 180;
  const cos = clamp((abx * cbx + aby * cby) / mag, -1, 1);
  return (Math.acos(cos) * 180) / Math.PI;
}

function sideAngle(
  landmarks: Landmark[],
  hip: number,
  knee: number,
  ankle: number
): number | null {
  const h = landmarks[hip];
  const k = landmarks[knee];
  const a = landmarks[ankle];
  if (
    !visible(h, KNEE_VISIBILITY) ||
    !visible(k, KNEE_VISIBILITY) ||
    !visible(a, KNEE_VISIBILITY)
  ) {
    return null;
  }
  return angleDeg(h, k, a);
}

/** Best visible knee angle, or null if the desk (or frame) hides the legs. */
export function bestKneeAngle(landmarks: Landmark[]): number | null {
  const left = sideAngle(
    landmarks,
    LM.LEFT_HIP,
    LM.LEFT_KNEE,
    LM.LEFT_ANKLE
  );
  const right = sideAngle(
    landmarks,
    LM.RIGHT_HIP,
    LM.RIGHT_KNEE,
    LM.RIGHT_ANKLE
  );
  if (left == null && right == null) return null;
  if (left == null) return right;
  if (right == null) return left;
  return (left + right) / 2;
}

export function kneesUsable(landmarks: Landmark[]): boolean {
  return bestKneeAngle(landmarks) != null;
}

export function readSquatSignals(landmarks: Landmark[]): SquatSignals {
  const hipsY = usableHipHeight(landmarks);
  const shouldersY = shoulderHeight(landmarks);
  const hipY = hipsY ?? shouldersY ?? noseHeight(landmarks);
  const kneeAngle = bestKneeAngle(landmarks);
  const kneesVisible = kneeAngle != null;
  let source: PoseSource = "none";
  if (hipY != null) {
    if (kneesVisible) source = "blend";
    else if (hipsY != null) source = "hip";
    else source = "shoulder";
  }
  return { hipY, kneeAngle, kneesVisible, source };
}

/**
 * 1 at calibrated squat hip, 0 at stand.
 * Works for both polarities: desk cams (squatY > standY) and low cams
 * (squatY < standY). The two anchors carry polarity.
 */
export function squatDepthFromHip(
  hipY: number,
  squatY: number,
  standY: number
): number {
  const range = squatY - standY;
  if (Math.abs(range) < 1e-4) return 0.5;
  return clamp((hipY - standY) / range, 0, 1);
}

/** 1 at parallel squat (~90°), 0 at stand (~172°). Angle needs no invert. */
export function squatDepthFromAngle(
  angle: number,
  squatAngle = SQUAT_ANGLE_DEG,
  standAngle = STAND_ANGLE_DEG
): number {
  const range = standAngle - squatAngle;
  if (Math.abs(range) < 1e-3) return 0.5;
  return clamp((standAngle - angle) / range, 0, 1);
}

export function blendSquatDepth(
  hipDepth: number,
  angleDepth: number | null,
  kneesVisible: boolean,
  hipWeight = HIP_BLEND_WEIGHT
): number {
  if (!kneesVisible || angleDepth == null) return hipDepth;
  const w = clamp(hipWeight, 0, 1);
  return w * hipDepth + (1 - w) * angleDepth;
}

/** Squat depth 1 (parallel) → bird up (0). Stand 0 → bird down (1). */
export function squatDepthToBirdNorm(squatDepth: number): number {
  return clamp(1 - squatDepth, 0, 1);
}

/**
 * True below-hip camera: the confirmed stand sits *lower in the frame*
 * than the squat. Chest-height cams do the opposite (squat increases Y)
 * and must not trip this on the first drop after Start.
 */
export function shouldInvertHip(squatY: number, standY: number): boolean {
  return standY - squatY > MIN_LEARNED_RANGE * 0.5;
}

export function mapNormToBirdY(
  mappedNorm: number,
  canvasH: number,
  birdRadius: number
): number {
  const pad = birdRadius + 4;
  const usable = canvasH - 2 * pad;
  const t = clamp(mappedNorm, 0, 1);
  const upFrac = clamp(CALIB_UP_BIRD_FRAC, 0, 0.35);
  return pad + upFrac * usable + t * (1 - upFrac) * usable;
}

type HistSample = { t: number; y: number };

export class PoseTracker {
  private smoothed: number | null = null;
  private reps = 0;
  private phase: "squat" | "stand" | "unknown" = "unknown";
  private minDepth = 1;
  private maxDepth = 0;

  private squatHipY: number | null = null;
  private standHipY: number | null = null;
  private minTorsoY: number | null = null;
  private maxTorsoY: number | null = null;
  private squatAngle: number | null = null;
  private standAngle: number | null = null;
  private hipInverted = false;

  private holdProgress = 0;
  private stableSince: number | null = null;
  private history: HistSample[] = [];
  private lastSignals: SquatSignals = {
    hipY: null,
    kneeAngle: null,
    kneesVisible: false,
    source: "none",
  };

  update(landmarks: Landmark[] | null, now = performance.now()): PoseSample {
    const empty = (): PoseSample => ({
      hipY: this.lastSignals.hipY ?? 0.55,
      kneeAngle: this.lastSignals.kneeAngle,
      kneesVisible: false,
      source: "none",
      squatDepth: this.smoothed ?? 0.5,
      hasPose: false,
      reps: this.reps,
      calibPhase: this.calibPhase(),
      holdProgress: this.squatHipY != null ? 1 : 0,
      squatHipY: this.squatHipY,
      mappedNorm: squatDepthToBirdNorm(this.smoothed ?? 0.5),
      hipInverted: this.hipInverted,
    });

    if (!landmarks || landmarks.length < 29) {
      this.breakHold();
      return empty();
    }

    const signals = readSquatSignals(landmarks);
    this.lastSignals = signals;
    if (signals.hipY == null) {
      this.breakHold();
      return empty();
    }

    this.observeTorso(signals);
    const rawDepth = this.instantSquatDepth(signals);
    if (this.smoothed == null) {
      this.smoothed = rawDepth;
    } else {
      this.smoothed = EMA_ALPHA * rawDepth + (1 - EMA_ALPHA) * this.smoothed;
    }

    this.pushHistory(now, this.smoothed);
    this.updateStartCalibration(now, this.smoothed, signals);
    this.observeTorso(signals);
    this.syncAnchors();
    this.updateReps(this.smoothed);

    return {
      hipY: signals.hipY,
      kneeAngle: signals.kneeAngle,
      kneesVisible: signals.kneesVisible,
      source: signals.source,
      squatDepth: this.smoothed,
      hasPose: true,
      reps: this.reps,
      calibPhase: this.calibPhase(),
      holdProgress: this.squatHipY != null ? 1 : this.holdProgress,
      squatHipY: this.squatHipY,
      mappedNorm: squatDepthToBirdNorm(this.smoothed),
      hipInverted: this.hipInverted,
    };
  }

  private torsoAnchors(hipY: number): { squatY: number; standY: number } {
    const minY = this.minTorsoY ?? this.squatHipY ?? hipY;
    const maxY = this.maxTorsoY ?? this.squatHipY ?? hipY;
    const span = maxY - minY;
    const usedSpan =
      span >= MIN_LEARNED_RANGE ? span : DEFAULT_STAND_OFFSET;
    const mid = span > 1e-6 ? (minY + maxY) / 2 : (this.squatHipY ?? hipY);
    const half = usedSpan / 2;
    if (this.hipInverted) {
      return { squatY: mid - half, standY: mid + half };
    }
    // Chest-height default: larger Y = deeper squat = bird up.
    return { squatY: mid + half, standY: mid - half };
  }

  private instantSquatDepth(signals: SquatSignals): number {
    const hipY = signals.hipY;
    if (hipY == null) return this.smoothed ?? 0.5;

    if (this.squatHipY == null) {
      // Pre-calib: prefer angle so a parallel squat reads “deep” immediately.
      if (signals.kneeAngle != null) {
        return squatDepthFromAngle(signals.kneeAngle);
      }
      return clamp(hipY, 0, 1);
    }

    const { squatY, standY } = this.torsoAnchors(hipY);
    const hipDepth = squatDepthFromHip(hipY, squatY, standY);
    const angleDepth =
      signals.kneeAngle != null
        ? squatDepthFromAngle(
            signals.kneeAngle,
            this.squatAngle ?? SQUAT_ANGLE_DEG,
            this.standAngle ?? STAND_ANGLE_DEG
          )
        : null;
    return blendSquatDepth(hipDepth, angleDepth, signals.kneesVisible);
  }

  private observeTorso(signals: SquatSignals) {
    if (this.squatHipY == null || signals.hipY == null) return;

    const candidate = signals.hipY;
    this.minTorsoY = Math.min(this.minTorsoY ?? candidate, candidate);
    this.maxTorsoY = Math.max(this.maxTorsoY ?? candidate, candidate);

    const minY = this.minTorsoY;
    const maxY = this.maxTorsoY;

    // Invert only with a knee-confirmed stand vs squat — not the first
    // chest-height drop after locking a standing torso.
    if (signals.kneeAngle != null) {
      const kneeDepth = squatDepthFromAngle(
        signals.kneeAngle,
        this.squatAngle ?? SQUAT_ANGLE_DEG,
        this.standAngle ?? STAND_ANGLE_DEG
      );
      if (kneeDepth < 0.3 && shouldInvertHip(minY, candidate)) {
        this.hipInverted = true;
      } else if (kneeDepth > 0.7 && shouldInvertHip(candidate, maxY)) {
        this.hipInverted = true;
      }
      if (signals.kneeAngle > (this.standAngle ?? STAND_ANGLE_DEG) - 8) {
        this.standAngle = Math.max(
          this.standAngle ?? signals.kneeAngle,
          signals.kneeAngle
        );
      }
    }
  }

  private syncAnchors() {
    if (this.squatHipY == null || this.minTorsoY == null || this.maxTorsoY == null) {
      return;
    }
    const { squatY, standY } = this.torsoAnchors(this.minTorsoY);
    this.squatHipY = squatY;
    this.standHipY = standY;
  }

  private calibPhase(): CalibPhase {
    if (this.squatHipY != null) return "set";
    if (this.holdProgress > 0) return "holding";
    return "waiting";
  }

  private pushHistory(now: number, y: number) {
    this.history.push({ t: now, y });
    const cutoff = now - Math.max(CALIB_HOLD_MS, 400);
    while (this.history.length && this.history[0].t < cutoff) {
      this.history.shift();
    }
  }

  private windowStd(now: number): number | null {
    const window = this.history.filter((s) => now - s.t <= CALIB_HOLD_MS);
    if (window.length < 6) return null;
    const mean = window.reduce((a, s) => a + s.y, 0) / window.length;
    const varSum = window.reduce((a, s) => a + (s.y - mean) ** 2, 0);
    return Math.sqrt(varSum / window.length);
  }

  private windowMean(now: number): number | null {
    const window = this.history.filter((s) => now - s.t <= CALIB_HOLD_MS);
    if (window.length < 6) return null;
    return window.reduce((a, s) => a + s.y, 0) / window.length;
  }

  private breakHold() {
    this.stableSince = null;
    this.holdProgress = 0;
  }

  /**
   * Lock bird “up” after ~1s of a stable squat (parallel / ~90°).
   */
  private updateStartCalibration(
    now: number,
    depth: number,
    signals: SquatSignals
  ) {
    if (this.squatHipY != null) {
      this.holdProgress = 1;
      return;
    }

    const std = this.windowStd(now);
    if (std == null || std > CALIB_MAX_STD) {
      this.breakHold();
      return;
    }

    if (this.stableSince == null) {
      this.stableSince = now;
    }
    const elapsed = now - this.stableSince;
    this.holdProgress = Math.min(1, elapsed / CALIB_HOLD_MS);

    if (elapsed >= CALIB_HOLD_MS) {
      const meanDepth = this.windowMean(now) ?? depth;
      const y = signals.hipY ?? meanDepth;
      this.anchorTorso(y, signals.kneeAngle);
    }
  }

  /**
   * Count completed squat cycles: stand → squat (a descent after rising).
   */
  private updateReps(depth: number) {
    this.minDepth = Math.min(this.minDepth, depth);
    this.maxDepth = Math.max(this.maxDepth, depth);
    const range = this.maxDepth - this.minDepth;
    if (range < 0.18) return;

    const mid = (this.minDepth + this.maxDepth) / 2;
    const squatThresh = mid + range * 0.22;
    const standThresh = mid - range * 0.22;

    if (this.phase === "unknown") {
      this.phase = depth > mid ? "squat" : "stand";
      return;
    }

    if (this.phase === "squat" && depth <= standThresh) {
      this.phase = "stand";
    } else if (this.phase === "stand" && depth >= squatThresh) {
      this.phase = "squat";
      this.reps += 1;
    }
  }

  resetCalibration() {
    this.reps = 0;
    this.phase = "unknown";
    this.minDepth = 1;
    this.maxDepth = 0;
    this.squatHipY = null;
    this.standHipY = null;
    this.minTorsoY = null;
    this.maxTorsoY = null;
    this.squatAngle = null;
    this.standAngle = null;
    this.hipInverted = false;
    this.holdProgress = 0;
    this.stableSince = null;
    this.history = [];
  }

  resetReps() {
    this.resetCalibration();
  }

  /**
   * Lock the current torso Y as the play anchor so Start is never stuck
   * waiting on the 1s hold gate. Chest-height polarity (larger Y = bird up)
   * applies until a knee-confirmed below-hip camera is seen. The first
   * squat or stand expands the live range so the bird moves immediately.
   */
  lockCurrentAsSquat(): boolean {
    const y = this.lastSignals.hipY;
    if (y == null) return false;
    this.anchorTorso(y, this.lastSignals.kneeAngle);
    return true;
  }

  private anchorTorso(y: number, kneeAngle: number | null) {
    this.squatHipY = y;
    this.standHipY = null;
    this.minTorsoY = y;
    this.maxTorsoY = y;
    this.hipInverted = false;
    this.squatAngle = kneeAngle ?? SQUAT_ANGLE_DEG;
    this.holdProgress = 1;
    this.stableSince = null;
  }

  get isCalibrated() {
    return this.squatHipY != null;
  }
}
