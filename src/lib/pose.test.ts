import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  angleDeg,
  bestKneeAngle,
  blendSquatDepth,
  hipHeight,
  readSquatSignals,
  shouldInvertHip,
  squatDepthFromAngle,
  squatDepthFromHip,
  squatDepthToBirdNorm,
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
    const squatDepth = squatDepthFromHip(squatY, squatY, standY, true);
    const standDepth = squatDepthFromHip(standY, squatY, standY, true);
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
});
