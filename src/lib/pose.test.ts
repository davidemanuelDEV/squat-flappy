import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  angleDeg,
  bestKneeAngle,
  blendSquatDepth,
  hipHeight,
  PoseTracker,
  readSquatSignals,
  shoulderHeight,
  shouldInvertHip,
  squatDepthFromAngle,
  squatDepthFromHip,
  squatDepthToBirdNorm,
  torsoHeight,
  usableHipHeight,
  type Landmark,
} from "./pose";
import { HIP_BLEND_WEIGHT, LM } from "./constants";

function lm(y: number, vis = 0.9, x = 0.5): Landmark {
  return { x, y, z: 0, visibility: vis };
}

function blankLandmarks(): Landmark[] {
  return Array.from({ length: 33 }, () => lm(0.5, 0));
}

/** Chest-height laptop: shoulders in frame, hips cropped / hallucinated. */
function croppedLaptop(
  shoulderY: number,
  hipY = 0.96,
  hipVis = 0.55
): Landmark[] {
  const marks = blankLandmarks();
  marks[LM.LEFT_SHOULDER] = lm(shoulderY);
  marks[LM.RIGHT_SHOULDER] = lm(shoulderY + 0.01);
  marks[LM.LEFT_HIP] = lm(hipY, hipVis);
  marks[LM.RIGHT_HIP] = lm(hipY + 0.01, hipVis);
  return marks;
}

function shouldersOnly(shoulderY: number): Landmark[] {
  const marks = blankLandmarks();
  marks[LM.LEFT_SHOULDER] = lm(shoulderY);
  marks[LM.RIGHT_SHOULDER] = lm(shoulderY + 0.01);
  return marks;
}

function inFrameHips(shoulderY: number, hipY: number, vis = 0.9): Landmark[] {
  const marks = blankLandmarks();
  marks[LM.LEFT_SHOULDER] = lm(shoulderY, vis, 0.4);
  marks[LM.RIGHT_SHOULDER] = lm(shoulderY, vis, 0.6);
  marks[LM.LEFT_HIP] = lm(hipY, vis, 0.4);
  marks[LM.RIGHT_HIP] = lm(hipY, vis, 0.6);
  return marks;
}

function pump(
  tracker: PoseTracker,
  marks: Landmark[],
  t0: number,
  n = 8,
  dt = 40
) {
  let sample = tracker.update(marks, t0);
  for (let i = 1; i < n; i++) {
    sample = tracker.update(marks, t0 + i * dt);
  }
  return sample;
}

describe("squat pose mapping", () => {
  it("treats parallel squat as bird up and stand as bird down", () => {
    const squatY = 0.72;
    const standY = 0.48;
    const squatDepth = squatDepthFromHip(squatY, squatY, standY);
    const standDepth = squatDepthFromHip(standY, squatY, standY);
    assert.equal(squatDepthToBirdNorm(squatDepth), 0);
    assert.equal(squatDepthToBirdNorm(standDepth), 1);
  });

  it("maps 90° knee angle to squat / bird up and 172° to stand / dive", () => {
    assert.ok(squatDepthFromAngle(90) > 0.95);
    assert.ok(squatDepthFromAngle(172) < 0.05);
    assert.equal(squatDepthToBirdNorm(squatDepthFromAngle(90)), 0);
    assert.ok(squatDepthToBirdNorm(squatDepthFromAngle(172)) > 0.95);
  });

  it("inverts hip when stand sits lower in the frame than squat", () => {
    assert.equal(shouldInvertHip(0.5, 0.7), true);
    assert.equal(shouldInvertHip(0.72, 0.48), false);
    const squatY = 0.5;
    const standY = 0.72;
    const squatDepth = squatDepthFromHip(squatY, squatY, standY);
    const standDepth = squatDepthFromHip(standY, squatY, standY);
    assert.ok(squatDepth > 0.9);
    assert.ok(standDepth < 0.1);
  });

  it("falls back to hip-only when knees are occluded", () => {
    const marks = blankLandmarks();
    marks[LM.LEFT_HIP] = lm(0.7);
    marks[LM.RIGHT_HIP] = lm(0.71);
    const signals = readSquatSignals(marks);
    assert.equal(signals.source, "hip");
    assert.equal(signals.kneesVisible, false);
    assert.equal(signals.kneeAngle, null);
    assert.ok(hipHeight(marks)! > 0.69);
  });

  it("blends hip + knee angle when legs are visible", () => {
    const marks = blankLandmarks();
    marks[LM.LEFT_HIP] = lm(0.55, 0.9, 0.4);
    marks[LM.RIGHT_HIP] = lm(0.55, 0.9, 0.6);
    marks[LM.LEFT_KNEE] = lm(0.72, 0.9, 0.4);
    marks[LM.RIGHT_KNEE] = lm(0.72, 0.9, 0.6);
    marks[LM.LEFT_ANKLE] = lm(0.9, 0.9, 0.4);
    marks[LM.RIGHT_ANKLE] = lm(0.9, 0.9, 0.6);
    const signals = readSquatSignals(marks);
    assert.equal(signals.source, "blend");
    assert.ok(signals.kneeAngle != null);
    assert.ok((bestKneeAngle(marks) ?? 0) > 160);

    const blended = blendSquatDepth(0.8, 0.2, true);
    const expected = HIP_BLEND_WEIGHT * 0.8 + (1 - HIP_BLEND_WEIGHT) * 0.2;
    assert.ok(Math.abs(blended - expected) < 1e-6);
    assert.equal(blendSquatDepth(0.8, 0.2, false), 0.8);
  });

  it("computes a right angle at the knee", () => {
    const deg = angleDeg({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 });
    assert.ok(Math.abs(deg - 90) < 0.01);
  });

  it("falls back to shoulders when hips are cropped (chest-height laptop)", () => {
    const marks = blankLandmarks();
    marks[LM.LEFT_SHOULDER] = lm(0.4);
    marks[LM.RIGHT_SHOULDER] = lm(0.42);
    const signals = readSquatSignals(marks);
    assert.equal(signals.source, "shoulder");
    assert.equal(signals.kneesVisible, false);
    assert.equal(hipHeight(marks), null);
    assert.ok(Math.abs((shoulderHeight(marks) ?? 0) - 0.41) < 1e-6);
    assert.ok(Math.abs((torsoHeight(marks) ?? 0) - 0.41) < 1e-6);
    assert.ok(Math.abs((signals.hipY ?? 0) - 0.41) < 1e-6);
  });

  it("prefers hips over shoulders when both are visible", () => {
    const marks = blankLandmarks();
    marks[LM.LEFT_SHOULDER] = lm(0.3);
    marks[LM.RIGHT_SHOULDER] = lm(0.3);
    marks[LM.LEFT_HIP] = lm(0.7);
    marks[LM.RIGHT_HIP] = lm(0.72);
    const signals = readSquatSignals(marks);
    assert.equal(signals.source, "hip");
    assert.ok(Math.abs((signals.hipY ?? 0) - 0.71) < 1e-6);
    assert.ok(Math.abs((torsoHeight(marks) ?? 0) - 0.71) < 1e-6);
  });

  it("blends knee angle when knees are in frame even if hips miss MIN_VISIBILITY", () => {
    const marks = blankLandmarks();
    marks[LM.LEFT_SHOULDER] = lm(0.32);
    marks[LM.RIGHT_SHOULDER] = lm(0.32);
    marks[LM.LEFT_HIP] = lm(0.55, 0.46, 0.4);
    marks[LM.RIGHT_HIP] = lm(0.55, 0.46, 0.6);
    marks[LM.LEFT_KNEE] = lm(0.72, 0.9, 0.4);
    marks[LM.RIGHT_KNEE] = lm(0.72, 0.9, 0.6);
    marks[LM.LEFT_ANKLE] = lm(0.9, 0.9, 0.4);
    marks[LM.RIGHT_ANKLE] = lm(0.9, 0.9, 0.6);
    const signals = readSquatSignals(marks);
    assert.equal(hipHeight(marks), null);
    assert.equal(signals.source, "blend");
    assert.ok(signals.kneeAngle != null);
    assert.ok((bestKneeAngle(marks) ?? 0) > 160);
  });

  it("treats a visible nose as a person in frame", () => {
    const marks = blankLandmarks();
    marks[LM.NOSE] = lm(0.22);
    const signals = readSquatSignals(marks);
    assert.equal(signals.source, "shoulder");
    assert.ok(Math.abs((signals.hipY ?? 0) - 0.22) < 1e-6);
    const sample = new PoseTracker().update(marks, 1);
    assert.equal(sample.hasPose, true);
  });

  it("does not report a pose when no person landmarks are visible", () => {
    const sample = new PoseTracker().update(blankLandmarks(), 1);
    assert.equal(sample.hasPose, false);
    assert.equal(sample.source, "none");
    assert.equal(new PoseTracker().lockCurrentAsSquat(), false);
  });

  it("sets hasPose from shoulders so Start can enable without hips", () => {
    const tracker = new PoseTracker();
    const marks = blankLandmarks();
    marks[LM.LEFT_SHOULDER] = lm(0.4);
    marks[LM.RIGHT_SHOULDER] = lm(0.41);
    const sample = tracker.update(marks, 500);
    assert.equal(sample.hasPose, true);
    assert.equal(sample.source, "shoulder");
    assert.ok(sample.hipY > 0.39 && sample.hipY < 0.42);
    assert.equal(tracker.isCalibrated, false);
    assert.equal(tracker.lockCurrentAsSquat(), true);
    assert.equal(tracker.isCalibrated, true);
    const locked = tracker.update(marks, 600);
    assert.equal(locked.calibPhase, "set");
    assert.equal(locked.hasPose, true);
  });

  it("ignores hallucinated cropped hips in favor of moving shoulders", () => {
    const standing = croppedLaptop(0.34);
    const squatting = croppedLaptop(0.48);
    const standSignals = readSquatSignals(standing);
    const squatSignals = readSquatSignals(squatting);

    assert.equal(usableHipHeight(standing), null);
    assert.ok((hipHeight(standing) ?? 0) > 0.9);
    assert.equal(standSignals.source, "shoulder");
    assert.ok(Math.abs((standSignals.hipY ?? 0) - 0.345) < 1e-6);
    assert.ok(Math.abs((torsoHeight(standing) ?? 0) - 0.345) < 1e-6);

    assert.equal(squatSignals.source, "shoulder");
    assert.ok((squatSignals.hipY ?? 0) > (standSignals.hipY ?? 0) + 0.1);
    assert.ok(Math.abs((squatSignals.hipY ?? 0) - 0.485) < 1e-6);
  });

  it("lock standing then squat moves the bird up without invert", () => {
    const tracker = new PoseTracker();
    const standing = shouldersOnly(0.32);
    const squatting = shouldersOnly(0.46);
    tracker.update(standing, 1000);
    assert.equal(tracker.lockCurrentAsSquat(), true);

    const stood = pump(tracker, standing, 1100);
    const sample = pump(tracker, squatting, 2000);

    assert.equal(sample.hasPose, true);
    assert.equal(sample.source, "shoulder");
    assert.equal(sample.hipInverted, false);
    assert.ok(
      sample.mappedNorm < stood.mappedNorm,
      `expected squat mappedNorm ${sample.mappedNorm} < stand ${stood.mappedNorm}`
    );
    assert.ok(
      sample.mappedNorm < 0.35,
      `expected bird up (mappedNorm toward 0), got ${sample.mappedNorm}`
    );
  });

  it("lock squat then stand moves the bird down", () => {
    const tracker = new PoseTracker();
    const squatting = shouldersOnly(0.48);
    const standing = shouldersOnly(0.34);
    tracker.update(squatting, 1000);
    assert.equal(tracker.lockCurrentAsSquat(), true);

    const squatted = pump(tracker, squatting, 1100);
    const sample = pump(tracker, standing, 2000);

    assert.equal(sample.hasPose, true);
    assert.equal(sample.hipInverted, false);
    assert.ok(
      sample.mappedNorm > squatted.mappedNorm,
      `expected stand mappedNorm ${sample.mappedNorm} > squat ${squatted.mappedNorm}`
    );
    assert.ok(
      sample.mappedNorm > 0.65,
      `expected bird down (mappedNorm toward 1), got ${sample.mappedNorm}`
    );
  });

  it("follows shoulders when cropped hips stay pinned while the torso drops", () => {
    const tracker = new PoseTracker();
    const standing = croppedLaptop(0.33);
    const squatting = croppedLaptop(0.47);
    tracker.update(standing, 500);
    assert.equal(tracker.lockCurrentAsSquat(), true);
    const stood = pump(tracker, standing, 600);
    const sample = pump(tracker, squatting, 1500);

    assert.equal(sample.source, "shoulder");
    assert.ok(sample.hipY < 0.55);
    assert.ok(sample.hipY > stood.hipY);
    assert.equal(sample.hipInverted, false);
    assert.ok(sample.mappedNorm < stood.mappedNorm);
    assert.ok(sample.mappedNorm < 0.35);
  });

  it("still prefers real in-frame hips when they are clearly visible below the shoulders", () => {
    const marks = inFrameHips(0.3, 0.68);
    const signals = readSquatSignals(marks);
    assert.ok(usableHipHeight(marks)! > 0.67);
    assert.equal(signals.source, "hip");
    assert.ok(Math.abs((signals.hipY ?? 0) - 0.68) < 1e-6);
    assert.ok(Math.abs((torsoHeight(marks) ?? 0) - 0.68) < 1e-6);

    const tracker = new PoseTracker();
    tracker.update(marks, 100);
    assert.equal(tracker.lockCurrentAsSquat(), true);
    const stood = pump(tracker, inFrameHips(0.3, 0.68), 200);
    const squat = pump(tracker, inFrameHips(0.42, 0.8), 800);
    assert.equal(squat.source, "hip");
    assert.equal(squat.hipInverted, false);
    assert.ok(squat.mappedNorm < stood.mappedNorm);
    assert.ok(squat.mappedNorm < 0.35);
  });

  it("inverts only when knees confirm a below-hip stand vs squat", () => {
    const tracker = new PoseTracker();
    const squat = blankLandmarks();
    squat[LM.LEFT_SHOULDER] = lm(0.28, 0.9, 0.4);
    squat[LM.RIGHT_SHOULDER] = lm(0.28, 0.9, 0.6);
    squat[LM.LEFT_HIP] = lm(0.5, 0.9, 0.4);
    squat[LM.RIGHT_HIP] = lm(0.5, 0.9, 0.6);
    squat[LM.LEFT_KNEE] = lm(0.7, 0.9, 0.4);
    squat[LM.RIGHT_KNEE] = lm(0.7, 0.9, 0.6);
    squat[LM.LEFT_ANKLE] = lm(0.7, 0.9, 0.62);
    squat[LM.RIGHT_ANKLE] = lm(0.7, 0.9, 0.62);

    const stand = blankLandmarks();
    stand[LM.LEFT_SHOULDER] = lm(0.48, 0.9, 0.4);
    stand[LM.RIGHT_SHOULDER] = lm(0.48, 0.9, 0.6);
    stand[LM.LEFT_HIP] = lm(0.72, 0.9, 0.4);
    stand[LM.RIGHT_HIP] = lm(0.72, 0.9, 0.6);
    stand[LM.LEFT_KNEE] = lm(0.86, 0.9, 0.4);
    stand[LM.RIGHT_KNEE] = lm(0.86, 0.9, 0.6);
    stand[LM.LEFT_ANKLE] = lm(0.99, 0.9, 0.4);
    stand[LM.RIGHT_ANKLE] = lm(0.99, 0.9, 0.6);

    tracker.update(squat, 1000);
    assert.equal(tracker.lockCurrentAsSquat(), true);
    pump(tracker, squat, 1100);
    const sample = pump(tracker, stand, 2000);
    assert.equal(sample.hipInverted, true);
    assert.ok(
      sample.mappedNorm > 0.65,
      `below-hip stand should dive (mappedNorm toward 1), got ${sample.mappedNorm}`
    );
  });
});
