/** Game & squat-pose constants for Squat Flappy */

export const HIGH_SCORE_KEY = "squat-flappy-high-score";
export const NICK_KEY = "squat-flappy-nick";
export const EMOJI_KEY = "squat-flappy-emoji";

/** Bird stays at fixed X (fraction of canvas width) */
export const BIRD_X_FRAC = 0.22;

/** Bird size relative to canvas height */
export const BIRD_RADIUS_FRAC = 0.028;

/** Gate width relative to canvas width */
export const PIPE_WIDTH_FRAC = 0.14;

/** Gap between top & bottom gate (fraction of height) — desktop / tall */
export const PIPE_GAP_FRAC = 0.28;

/** Larger gap on short/narrow screens so phone play is fairer */
export const PIPE_GAP_FRAC_MOBILE = 0.36;

/** Treat canvas as "phone-ish" when below these CSS sizes */
export const MOBILE_GAP_MAX_HEIGHT = 700;
export const MOBILE_GAP_MAX_WIDTH = 500;

/** Horizontal speed in canvas-widths per second */
export const PIPE_SPEED = 0.22;

/** Spacing between successive gate pairs (canvas widths) */
export const PIPE_SPACING = 0.55;

/** EMA alpha for squat signal smoothing (higher = snappier) */
export const EMA_ALPHA = 0.35;

/**
 * Hold a stable ~90° squat for this long to lock bird “up”.
 */
export const CALIB_HOLD_MS = 1000;

/** Max stddev of smoothed squat-depth over the hold window.
 *  Slightly loose so a standing chest-height laptop cam can still lock. */
export const CALIB_MAX_STD = 0.035;

/**
 * Seed torso-Y band after Start until a real squat/stand is observed.
 * Shoulder travel on a chest-height cam is ~8–15%, not a 0.22 hip drop.
 */
export const DEFAULT_STAND_OFFSET = 0.12;

/** Minimum usable torso-Y range once motion is observed (full bird travel). */
export const MIN_LEARNED_RANGE = 0.08;

/**
 * MediaPipe still emits hips when they’re cropped off the bottom of a
 * chest-height laptop frame: Y pinned near 1 with only mediocre visibility.
 * Trust those only if visibility is strong.
 */
export const HIP_CROP_Y = 0.85;
export const HIP_RELIABLE_VISIBILITY = 0.7;

/** How far toward the top of the playable band calibrated squat sits */
export const CALIB_UP_BIRD_FRAC = 0.12;

/** Parallel squat ≈ this knee angle (hip–knee–ankle) */
export const SQUAT_ANGLE_DEG = 90;

/** Standing tall ≈ this knee angle */
export const STAND_ANGLE_DEG = 172;

/** Hip weight when knees are visible (chest-height cam keeps hips/knees in frame) */
export const HIP_BLEND_WEIGHT = 0.68;

/** Visibility threshold for using a landmark */
export const MIN_VISIBILITY = 0.5;

/** Knees/ankles need this visibility to contribute angle */
export const KNEE_VISIBILITY = 0.45;

/** MediaPipe Pose landmark indices */
export const LM = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

/** CDN paths for MediaPipe WASM + model (no API keys) */
export const MEDIAPIPE_WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
export const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
