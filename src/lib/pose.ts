/**
 * Pose → bird Y for Squat Flappy.
 *
 * This is NOT torso-Y push-up mapping.
 *
 * Calibrate holding a ~90° air squat (thighs parallel) as bird UP.
 * Standing tall = dive (bird down).
 *
 * Primary signal: hip height (MediaPipe Y grows downward).
 * Secondary: knee angle (hip–knee–ankle) when knees are visible.
 * Recommended setup: chest-height webcam so hips and knees stay in frame.
 * Desk occlusion: if the desk hides knees, fall back to hip-only.
 *
 * Desk hypothesis: hip Y is more reliable than knees at a standing desk.
 * If the camera is below hip height, standing can increase hip Y — we
 * invert the hip polarity once a real stand is learned.
 */

import {
  CALIB_HOLD_MS,
  CALIB_MAX_STD,
  CALIB_UP_BIRD_FRAC,
  DEFAULT_STAND_OFFSET,
  EMA_ALPHA,
  HIP_BLEND_WEIGHT,
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

export type PoseSource = "blend" | "hip" | "none";

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

/** Average visible hip Y in [0,1] (MediaPipe: larger = lower in frame). */
export function hipHeight(landmarks: Landmark[]): number | null {
  const hips: Landmark[] = [];
  const lh = landmarks[LM.LEFT_HIP];
  const rh = landmarks[LM.RIGHT_HIP];
  if (visible(lh)) hips.push(lh);
  if (visible(rh)) hips.push(rh);
  if (hips.length === 0) return null;
  return meanY(hips);
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
  const hipY = hipHeight(landmarks);
  const kneeAngle = bestKneeAngle(landmarks);
  const kneesVisible = kneeAngle != null;
  const source: PoseSource =
    hipY == null ? "none" : kneesVisible ? "blend" : "hip";
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
 * If the learned stand hip is *below* the squat hip in the frame, the
 * default “higher Y = deeper squat” assumption is wrong — invert hip.
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

    const rawDepth = this.instantSquatDepth(signals);
    if (this.smoothed == null) {
      this.smoothed = rawDepth;
    } else {
      this.smoothed = EMA_ALPHA * rawDepth + (1 - EMA_ALPHA) * this.smoothed;
    }

    this.pushHistory(now, this.smoothed);
    this.updateStartCalibration(now, this.smoothed, signals);
    this.learnRange(signals);
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

    const standY =
      this.standHipY ??
      (this.hipInverted
        ? this.squatHipY + DEFAULT_STAND_OFFSET
        : this.squatHipY - DEFAULT_STAND_OFFSET);
    const hipDepth = squatDepthFromHip(hipY, this.squatHipY, standY);
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

  private learnRange(signals: SquatSignals) {
    if (this.squatHipY == null || signals.hipY == null) return;

    const candidate = signals.hipY;
    const delta = candidate - this.squatHipY;
    if (Math.abs(delta) < MIN_LEARNED_RANGE * 0.5) return;

    if (this.standHipY == null) {
      this.standHipY = candidate;
    } else if (this.hipInverted) {
      // Inverted: stand is the larger Y
      this.standHipY = Math.max(this.standHipY, candidate);
    } else if (candidate < this.squatHipY) {
      this.standHipY = Math.min(this.standHipY, candidate);
    } else if (candidate > this.squatHipY && this.standHipY < this.squatHipY) {
      // Keep existing stand; ignore deeper-than-squat hips unless invert trips
    }

    if (this.standHipY != null && shouldInvertHip(this.squatHipY, this.standHipY)) {
      this.hipInverted = true;
    }

    if (signals.kneeAngle != null) {
      if (signals.kneeAngle > (this.standAngle ?? STAND_ANGLE_DEG) - 8) {
        this.standAngle = Math.max(this.standAngle ?? signals.kneeAngle, signals.kneeAngle);
      }
    }
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
      this.squatHipY = signals.hipY ?? meanDepth;
      this.standHipY = this.squatHipY - DEFAULT_STAND_OFFSET;
      this.squatAngle = signals.kneeAngle ?? SQUAT_ANGLE_DEG;
      this.holdProgress = 1;
      this.stableSince = null;
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

  get isCalibrated() {
    return this.squatHipY != null;
  }
}
