/**
 * Scrolling gates + collision.
 * Bird Y is driven by squat pose, not gravity.
 * Gate gaps use a seeded RNG so daily runs are comparable.
 * Cadence: first 10 spawned pipes are full-range squat reps
 * (stand ↔ drop, one pipe each), then a short mid-band hold (2–4),
 * then ~8–10 reps, repeating. No long wall-sits / bottom planks.
 *
 * Hip polarity (do not invert here): parallel squat = bird UP (small Y),
 * standing tall = bird DOWN (large Y). Cadence is the gap-Y pattern only.
 * Speed: +10% at 15, 20, 25, 30, … (compounding).
 */

import {
  BIRD_RADIUS_FRAC,
  BIRD_X_FRAC,
  MOBILE_GAP_MAX_HEIGHT,
  MOBILE_GAP_MAX_WIDTH,
  PIPE_GAP_FRAC,
  PIPE_GAP_FRAC_MOBILE,
  PIPE_SPACING,
  PIPE_SPEED,
  PIPE_WIDTH_FRAC,
} from "./constants";
import { dailyPipeSeed, laDayKey } from "./daily";
import { type Rng, rngFromString } from "./rng";

/** Fixed RNG draws per gate so pipeIndex stays deterministic. */
const DRAWS_PER_PIPE = 6;

export type Pipe = {
  x: number;
  gapY: number;
  scored: boolean;
};

export type Cadence = {
  kind: "hold" | "reps" | "rise" | "fall";
  remaining: number;
  gapY: number;
  step: number;
};

/** First ten spawned pipes are always full-range squat reps. */
export const OPENING_REP_COUNT = 10;
const HOLD_LEN_MIN = 2;
const HOLD_LEN_SPAN = 3; // 2–4
const CYCLE_REP_MIN = 8;
const CYCLE_REP_SPAN = 3; // 8–10
/** Stay just inside the playable extremes so a rep is a real stand/drop. */
const REP_INSET = 0.06;
const HOLD_MID_T = 0.5;
const HOLD_LOW_T = 0.64;

export type GameState = {
  status: "ready" | "playing" | "over";
  birdY: number;
  pipes: Pipe[];
  score: number;
  highScore: number;
  width: number;
  height: number;
  dayKey: string;
  seed: string;
  pipeIndex: number;
  cadence: Cadence | null;
};

export function createInitialState(
  width: number,
  height: number,
  highScore: number,
  dayKey: string = laDayKey()
): GameState {
  const seed = dailyPipeSeed(dayKey);
  return {
    status: "ready",
    birdY: height * 0.5,
    pipes: [],
    score: 0,
    highScore,
    width,
    height,
    dayKey,
    seed,
    pipeIndex: 0,
    cadence: null,
  };
}

function gapBounds(height: number, gap: number): { min: number; max: number } {
  const margin = gap * 0.55 + height * 0.08;
  return { min: margin, max: height - margin };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * +10% gate speed at score 15, again at 20, 25, 30, … (compounding).
 * score 0–14 → 1×; 15–19 → 1.1×; 20–24 → 1.21×; …
 */
export function pipeSpeedMultiplier(score: number): number {
  if (score < 15) return 1;
  const steps = Math.floor((score - 15) / 5) + 1;
  return Math.pow(1.1, steps);
}

function rngAt(seed: string, pipeIndex: number): Rng {
  const rng = rngFromString(seed);
  for (let i = 0; i < pipeIndex * DRAWS_PER_PIPE; i++) rng();
  return rng;
}

export function pipeGapFrac(width: number, height: number): number {
  if (height < MOBILE_GAP_MAX_HEIGHT || width < MOBILE_GAP_MAX_WIDTH) {
    return PIPE_GAP_FRAC_MOBILE;
  }
  return PIPE_GAP_FRAC;
}

function repBand(height: number, gap: number) {
  const { min, max } = gapBounds(height, gap);
  const range = max - min;
  return {
    min,
    max,
    range,
    /** Squat / drop — bird UP (small canvas Y). */
    highY: min + range * REP_INSET,
    /** Stand — bird DOWN (large canvas Y). */
    lowY: max - range * REP_INSET,
    midY: min + range * HOLD_MID_T,
    midLowY: min + range * HOLD_LOW_T,
  };
}

function pickCadence(
  rng: Rng,
  height: number,
  gap: number,
  prevKind: Cadence["kind"] | null
): Cadence {
  const band = repBand(height, gap);

  // Opening (or any first pick): guaranteed full-range reps, no RNG, no holds.
  // Start at stand (lowY) so the first ten force stand–drop–stand, not a sit.
  if (prevKind == null) {
    return {
      kind: "reps",
      remaining: OPENING_REP_COUNT,
      gapY: band.lowY,
      step: 0,
    };
  }

  if (prevKind === "reps") {
    const remaining = HOLD_LEN_MIN + Math.floor(rng() * HOLD_LEN_SPAN);
    const slightlyLower = rng() < 0.5;
    return {
      kind: "hold",
      remaining,
      gapY: slightlyLower ? band.midLowY : band.midY,
      step: 0,
    };
  }

  // After a hold (or a leftover rise/fall): another set of stand–drop reps.
  const remaining = CYCLE_REP_MIN + Math.floor(rng() * CYCLE_REP_SPAN);
  return {
    kind: "reps",
    remaining,
    gapY: band.lowY,
    step: 0,
  };
}

export function spawnPipe(
  state: GameState,
  x?: number
): { pipe: Pipe; nextIndex: number; cadence: Cadence } {
  const gap = state.height * pipeGapFrac(state.width, state.height);
  const { min, max } = gapBounds(state.height, gap);
  const rng = rngAt(state.seed, state.pipeIndex);
  const draws: number[] = [];
  for (let i = 0; i < DRAWS_PER_PIPE; i++) draws.push(rng());
  let di = 0;
  const next = (): number => draws[di++] ?? 0.5;
  const localRng: Rng = () => next();

  let cadence = state.cadence;
  if (!cadence || cadence.remaining <= 0) {
    cadence = pickCadence(
      localRng,
      state.height,
      gap,
      cadence?.kind ?? null
    );
  }

  const gapY = clamp(cadence.gapY, min, max);

  let followingY = gapY;
  if (cadence.kind === "reps") {
    const band = repBand(state.height, gap);
    followingY = gapY <= band.midY ? band.lowY : band.highY;
  } else if (cadence.kind === "rise" || cadence.kind === "fall") {
    followingY = clamp(gapY + cadence.step, min, max);
  }
  const nextCadence: Cadence = {
    kind: cadence.kind,
    remaining: Math.max(0, cadence.remaining - 1),
    gapY: followingY,
    step: cadence.step,
  };

  while (di < DRAWS_PER_PIPE) next();

  return {
    pipe: {
      x: x ?? state.width + 20,
      gapY,
      scored: false,
    },
    nextIndex: state.pipeIndex + 1,
    cadence: nextCadence,
  };
}

export function startGame(state: GameState): GameState {
  const spacing = state.width * PIPE_SPACING;
  const pipes: Pipe[] = [];
  let pipeIndex = 0;
  let cadence: Cadence | null = null;
  let working: GameState = { ...state, pipeIndex: 0, pipes: [], cadence: null };
  for (let i = 0; i < 3; i++) {
    const spawned = spawnPipe(working, state.width * 0.75 + i * spacing);
    pipes.push(spawned.pipe);
    pipeIndex = spawned.nextIndex;
    cadence = spawned.cadence;
    working = { ...working, pipeIndex, pipes: [...pipes], cadence };
  }
  return {
    ...state,
    status: "playing",
    score: 0,
    pipes,
    pipeIndex,
    cadence,
    dayKey: state.dayKey || laDayKey(),
    seed: state.seed || dailyPipeSeed(state.dayKey || laDayKey()),
  };
}

export function birdRadius(height: number): number {
  return height * BIRD_RADIUS_FRAC;
}

export function birdX(width: number): number {
  return width * BIRD_X_FRAC;
}

export function pipeWidth(width: number): number {
  return width * PIPE_WIDTH_FRAC;
}

export function pipeGap(width: number, height: number): number {
  return height * pipeGapFrac(width, height);
}

export function tick(state: GameState, dt: number, birdY: number): GameState {
  if (state.status !== "playing") {
    return { ...state, birdY };
  }

  const w = state.width;
  const h = state.height;
  const pw = pipeWidth(w);
  const gap = pipeGap(w, h);
  const bx = birdX(w);
  const br = birdRadius(h);
  const spacing = w * PIPE_SPACING;

  const speed = w * PIPE_SPEED * pipeSpeedMultiplier(state.score);
  let pipes = state.pipes.map((p) => ({ ...p, x: p.x - speed * dt }));
  let score = state.score;
  let pipeIndex = state.pipeIndex;
  let cadence = state.cadence;

  for (const p of pipes) {
    if (!p.scored && p.x + pw < bx - br) {
      p.scored = true;
      score += 1;
    }
  }

  pipes = pipes.filter((p) => p.x + pw > -40);
  while (pipes.length < 3) {
    const last = pipes[pipes.length - 1];
    const nx = last ? last.x + spacing : w + 20;
    const spawned = spawnPipe(
      { ...state, pipeIndex, pipes, cadence, score },
      nx
    );
    pipes.push(spawned.pipe);
    pipeIndex = spawned.nextIndex;
    cadence = spawned.cadence;
  }

  const by = birdY;
  let hit = false;

  if (by - br < 0 || by + br > h) hit = true;

  for (const p of pipes) {
    const inX = bx + br > p.x && bx - br < p.x + pw;
    if (!inX) continue;
    const gapTop = p.gapY - gap / 2;
    const gapBot = p.gapY + gap / 2;
    if (by - br < gapTop || by + br > gapBot) {
      hit = true;
      break;
    }
  }

  const highScore = Math.max(state.highScore, score);

  if (hit) {
    return {
      ...state,
      birdY: by,
      pipes,
      score,
      highScore,
      pipeIndex,
      cadence,
      status: "over",
    };
  }

  return {
    ...state,
    birdY: by,
    pipes,
    score,
    highScore,
    pipeIndex,
    cadence,
  };
}
