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
  type Landmark,
} from "./pose";
import { HIP_BLEND_WEIGHT, LM } from "./constants";

function lm(y: number, vis = 0.9, x = 0.5): Landmark {
  return { x, y, z: 0, visibility: vis };
}

function blankLandmarks(): Landmark[] {
  return Array.from({ length: 33 }, () => lm(0.5, 0));
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

  it("learns invert after locking a standing torso then dropping into a squat", () => {
    const tracker = new PoseTracker();
    const standing = blankLandmarks();
    standing[LM.LEFT_SHOULDER] = lm(0.32);
    standing[LM.RIGHT_SHOULDER] = lm(0.33);
    tracker.update(standing, 1000);
    assert.equal(tracker.lockCurrentAsSquat(), true);

    const squatting = blankLandmarks();
    squatting[LM.LEFT_SHOULDER] = lm(0.48);
    squatting[LM.RIGHT_SHOULDER] = lm(0.49);
    const sample = tracker.update(squatting, 1100);
    assert.equal(sample.hasPose, true);
    assert.equal(sample.source, "shoulder");
    assert.equal(sample.hipInverted, true);
  });
});
