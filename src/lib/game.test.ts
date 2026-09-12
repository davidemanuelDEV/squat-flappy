import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createInitialState,
  OPENING_REP_COUNT,
  pipeSpeedMultiplier,
  spawnPipe,
  startGame,
  tick,
  type Cadence,
  type GameState,
  type Pipe,
} from "./game";
import { dailyPipeSeed } from "./daily";

const W = 800;
const H = 800;

function spawnMany(
  dayKey: string,
  n: number,
  width = W,
  height = H
): { pipes: Pipe[]; cadence: Cadence | null; state: GameState } {
  let state = createInitialState(width, height, 0, dayKey);
  const pipes: Pipe[] = [];
  let cadence: Cadence | null = null;
  let pipeIndex = 0;
  for (let i = 0; i < n; i++) {
    const spawned = spawnPipe(
      { ...state, pipeIndex, pipes: [...pipes], cadence },
      i * 100
    );
    pipes.push(spawned.pipe);
    pipeIndex = spawned.nextIndex;
    cadence = spawned.cadence;
    state = { ...state, pipeIndex, pipes: [...pipes], cadence };
  }
  return { pipes, cadence, state };
}

function sameY(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-6;
}

function holdRunLength(pipes: Pipe[], start: number): number {
  const y = pipes[start]!.gapY;
  let n = 1;
  for (let i = start + 1; i < pipes.length; i++) {
    if (!sameY(pipes[i]!.gapY, y)) break;
    n += 1;
  }
  return n;
}

describe("pipe speed + daily seed", () => {
  it("stays 1× until 15, then compounds +10% at 15/20/25/30…", () => {
    assert.equal(pipeSpeedMultiplier(0), 1);
    assert.equal(pipeSpeedMultiplier(14), 1);
    assert.equal(pipeSpeedMultiplier(15), Math.pow(1.1, 1));
    assert.equal(pipeSpeedMultiplier(19), Math.pow(1.1, 1));
    assert.equal(pipeSpeedMultiplier(20), Math.pow(1.1, 2));
    assert.equal(pipeSpeedMultiplier(24), Math.pow(1.1, 2));
    assert.equal(pipeSpeedMultiplier(25), Math.pow(1.1, 3));
    assert.equal(pipeSpeedMultiplier(29), Math.pow(1.1, 3));
    assert.equal(pipeSpeedMultiplier(30), Math.pow(1.1, 4));
    assert.equal(pipeSpeedMultiplier(35), Math.pow(1.1, 5));
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

describe("squat cadence", () => {
  it("makes the first ten spawned pipes alternate stand ↔ drop with a real dip", () => {
    const { pipes } = spawnMany("cadence-open", OPENING_REP_COUNT + 8);
    const first = pipes.slice(0, OPENING_REP_COUNT);
    const standY = first[0]!.gapY;
    const dropY = first[1]!.gapY;

    assert.ok(
      standY > dropY,
      "first pipe is stand (bird down / large Y); drop is squat (bird up / small Y)"
    );
    assert.ok(
      standY - dropY > H * 0.3,
      `amplitude ${standY - dropY} should use most of the playable band`
    );

    for (let i = 0; i < OPENING_REP_COUNT; i++) {
      const expected = i % 2 === 0 ? standY : dropY;
      assert.ok(
        sameY(first[i]!.gapY, expected),
        `pipe ${i} should be ${i % 2 === 0 ? "stand" : "drop"}`
      );
    }
  });

  it("follows the opening ten with a short mid-band hold, then reps again", () => {
    const { pipes } = spawnMany("cadence-hold", 40);
    const standY = pipes[0]!.gapY;
    const dropY = pipes[1]!.gapY;
    const mid = (standY + dropY) / 2;

    const holdLen = holdRunLength(pipes, OPENING_REP_COUNT);
    assert.ok(
      holdLen >= 2 && holdLen <= 4,
      `hold length ${holdLen} should be 2–4`
    );

    const holdY = pipes[OPENING_REP_COUNT]!.gapY;
    const span = standY - dropY;
    assert.ok(
      holdY < standY - span * 0.2 && holdY > dropY + span * 0.25,
      `hold Y ${holdY} should sit mid-band, not a wall-sit or stand lock`
    );
    assert.ok(
      Math.abs(holdY - mid) < span * 0.3,
      "hold is near halfway down a squat"
    );

    const after = OPENING_REP_COUNT + holdLen;
    assert.ok(!sameY(pipes[after]!.gapY, pipes[after + 1]!.gapY));
    assert.ok(
      sameY(pipes[after]!.gapY, standY) || sameY(pipes[after]!.gapY, dropY)
    );
    assert.ok(
      sameY(pipes[after + 1]!.gapY, standY) ||
        sameY(pipes[after + 1]!.gapY, dropY)
    );
  });

  it("never uses a multi-pipe hold in the opening ten", () => {
    for (const day of ["a", "b", "2026-09-12", "cadence-open"]) {
      const { pipes } = spawnMany(day, OPENING_REP_COUNT);
      for (let i = 1; i < pipes.length; i++) {
        assert.ok(
          !sameY(pipes[i]!.gapY, pipes[i - 1]!.gapY),
          `day ${day} pipe ${i} held from previous`
        );
      }
    }
  });

  it("keeps daily seeds deterministic and the opening ten identical across days", () => {
    const a = spawnMany("2026-09-11", 30).pipes.map((p) => p.gapY);
    const b = spawnMany("2026-09-11", 30).pipes.map((p) => p.gapY);
    assert.deepEqual(a, b);

    const days = ["2026-09-12", "2026-01-01", "hold-seed", "zzz"];
    for (const day of days) {
      const other = spawnMany(day, 30).pipes.map((p) => p.gapY);
      assert.deepEqual(
        a.slice(0, OPENING_REP_COUNT),
        other.slice(0, OPENING_REP_COUNT)
      );
    }
    const later = days.map((day) =>
      spawnMany(day, 30).pipes.map((p) => p.gapY).slice(OPENING_REP_COUNT)
    );
    assert.ok(
      later.some((seq, i) =>
        later.some(
          (other, j) =>
            j > i && seq.some((y, k) => !sameY(y, other[k]!))
        )
      ),
      "seeded hold length / mid height should vary after the opening ten"
    );
  });

  it("startGame pre-spawns stand-drop-stand opening reps", () => {
    const ready = createInitialState(W, H, 0, "start-seed");
    const playing = startGame(ready);
    assert.equal(playing.pipes.length, 3);
    assert.ok(playing.pipes[0]!.gapY > playing.pipes[1]!.gapY);
    assert.ok(sameY(playing.pipes[0]!.gapY, playing.pipes[2]!.gapY));
    assert.equal(playing.pipeIndex, 3);
    assert.equal(playing.seed, "squat-flappy-pipes:start-seed");
  });

  it("repeats short mid holds after later ~8–10 rep blocks", () => {
    const { pipes } = spawnMany("cycle-again", 50);
    const firstHold = holdRunLength(pipes, OPENING_REP_COUNT);
    const afterHold = OPENING_REP_COUNT + firstHold;

    let repLen = 1;
    for (let i = afterHold + 1; i < pipes.length; i++) {
      if (sameY(pipes[i]!.gapY, pipes[i - 1]!.gapY)) break;
      repLen += 1;
    }
    assert.ok(
      repLen >= 8 && repLen <= 10,
      `cycle rep length ${repLen} should be 8–10`
    );

    const secondHold = holdRunLength(pipes, afterHold + repLen);
    assert.ok(
      secondHold >= 2 && secondHold <= 4,
      `second hold ${secondHold} should be 2–4`
    );
  });
});
