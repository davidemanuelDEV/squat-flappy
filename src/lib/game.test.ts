import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pipeSpeedMultiplier, startGame, createInitialState, tick } from "./game";
import { dailyPipeSeed } from "./daily";

describe("pipe speed + daily seed", () => {
  it("compounds +10% at 15/20/25/30", () => {
    assert.equal(pipeSpeedMultiplier(0), 1);
    assert.equal(pipeSpeedMultiplier(14), 1);
    assert.equal(pipeSpeedMultiplier(15), 1.1);
    assert.ok(Math.abs(pipeSpeedMultiplier(20) - 1.21) < 1e-10);
    assert.ok(Math.abs(pipeSpeedMultiplier(25) - 1.331) < 1e-10);
    assert.ok(Math.abs(pipeSpeedMultiplier(30) - 1.4641) < 1e-10);
  });

  it("uses a squat-flappy daily seed, never a push-flappy key", () => {
    const seed = dailyPipeSeed("2026-09-11");
    assert.equal(seed, "squat-flappy-pipes:2026-09-11");
    assert.ok(!seed.includes("push-flappy"));
  });

  it("starts a playable run with three gates", () => {
    const ready = createInitialState(800, 600, 0, "2026-09-11");
    const playing = startGame(ready);
    assert.equal(playing.status, "playing");
    assert.equal(playing.pipes.length, 3);
    assert.equal(playing.seed, "squat-flappy-pipes:2026-09-11");
  });

  it("scores when the bird clears a gate", () => {
    const ready = createInitialState(800, 600, 0, "2026-09-11");
    let state = startGame(ready);
    state = {
      ...state,
      pipes: state.pipes.map((p, i) =>
        i === 0 ? { ...p, x: 40, gapY: 300 } : p
      ),
    };
    const next = tick(state, 0.05, 300);
    assert.ok(next.score >= 1);
  });
});
