/**
 * Daily leaderboard persistence.
 * Prefer Vercel KV / Upstash REST when env is set; otherwise in-memory.
 * Keys are prefixed squat-flappy: so they never mix with the push board.
 */

import { laDayKey } from "./daily";
import { normalizeCountry } from "./country";

export type LeaderboardEntry = {
  nick: string;
  emoji: string;
  score: number;
  reps: number;
  dayKey: string;
  at: number;
  country: string;
  demo?: boolean;
};

export type LeaderboardPayload = {
  dayKey: string;
  entries: LeaderboardEntry[];
  storage: "kv" | "memory";
  demo: boolean;
};

const MAX_ENTRIES = 50;
const KEY_PREFIX = "squat-flappy:lb:";

type GlobalMem = {
  __squatFlappyLb?: Map<string, LeaderboardEntry[]>;
  __squatFlappyRl?: Map<string, number[]>;
  __squatFlappySeeded?: Set<string>;
};

function memStore(): Map<string, LeaderboardEntry[]> {
  const g = globalThis as unknown as GlobalMem;
  if (!g.__squatFlappyLb) g.__squatFlappyLb = new Map();
  return g.__squatFlappyLb;
}

function seededDays(): Set<string> {
  const g = globalThis as unknown as GlobalMem;
  if (!g.__squatFlappySeeded) g.__squatFlappySeeded = new Set();
  return g.__squatFlappySeeded;
}

export function rateLimitStore(): Map<string, number[]> {
  const g = globalThis as unknown as GlobalMem;
  if (!g.__squatFlappyRl) g.__squatFlappyRl = new Map();
  return g.__squatFlappyRl;
}

export function kvConfigured(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export function demoLeaderboardAllowed(): boolean {
  if (process.env.ALLOW_DEMO_LEADERBOARD === "1") return true;
  return process.env.NODE_ENV !== "production";
}

async function kvCommand<T>(
  ...args: (string | number)[]
): Promise<T | null> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const res = await fetch(`${url}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("KV command failed", res.status, await res.text());
    return null;
  }
  const json = (await res.json()) as { result: T };
  return json.result;
}

function sortEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.reps !== a.reps) return b.reps - a.reps;
    return a.at - b.at;
  });
}

function normalizeEntry(e: LeaderboardEntry): LeaderboardEntry {
  return {
    ...e,
    country: normalizeCountry(e.country),
    demo: Boolean(e.demo),
  };
}

const SEED_TEMPLATE: Omit<LeaderboardEntry, "dayKey" | "at">[] = [
  { nick: "DeskDodger", emoji: "🪑", score: 41, reps: 36, country: "US", demo: true },
  { nick: "QuadGoblin", emoji: "🦵", score: 36, reps: 40, country: "GB", demo: true },
  { nick: "ParallelPete", emoji: "🟢", score: 32, reps: 28, country: "CA", demo: true },
  { nick: "AirSquatAnn", emoji: "🐦", score: 27, reps: 24, country: "AU", demo: true },
  { nick: "ChestHeight", emoji: "💚", score: 23, reps: 21, country: "DE", demo: true },
  { nick: "LimeBird", emoji: "🐤", score: 18, reps: 16, country: "JP", demo: true },
  { nick: "StandFirst", emoji: "🧍", score: 14, reps: 15, country: "BR", demo: true },
  { nick: "GateRunner", emoji: "🚪", score: 11, reps: 12, country: "IN", demo: true },
  { nick: "NinetyHold", emoji: "📐", score: 8, reps: 9, country: "FR", demo: true },
  { nick: "ArcadeHips", emoji: "🕹️", score: 5, reps: 7, country: "MX", demo: true },
];

export function demoEntriesForDay(dayKey: string): LeaderboardEntry[] {
  const base = Date.parse(`${dayKey}T16:00:00-07:00`);
  const t0 = Number.isFinite(base) ? base : Date.now() - 3_600_000;
  return SEED_TEMPLATE.map((s, i) =>
    normalizeEntry({
      ...s,
      dayKey,
      at: t0 + i * 97_000,
    })
  );
}

export function mergeWithSeeds(
  dayKey: string,
  stored: LeaderboardEntry[]
): LeaderboardEntry[] {
  const normalized = stored.map(normalizeEntry);
  if (!demoLeaderboardAllowed()) {
    return sortEntries(normalized.filter((e) => !e.demo)).slice(0, MAX_ENTRIES);
  }
  const seeds = demoEntriesForDay(dayKey);
  if (normalized.length === 0) return seeds;

  const byNick = new Map<string, LeaderboardEntry>();
  for (const s of seeds) byNick.set(s.nick.toLowerCase(), s);
  for (const e of normalized) {
    byNick.set(e.nick.toLowerCase(), e);
  }
  return sortEntries([...byNick.values()]).slice(0, MAX_ENTRIES);
}

async function readRaw(dayKey: string): Promise<{
  entries: LeaderboardEntry[];
  storage: "kv" | "memory";
}> {
  const key = KEY_PREFIX + dayKey;
  if (kvConfigured()) {
    const raw = await kvCommand<string | null>("GET", key);
    let entries: LeaderboardEntry[] = [];
    if (raw) {
      try {
        entries = (JSON.parse(raw) as LeaderboardEntry[]).map(normalizeEntry);
      } catch {
        entries = [];
      }
    }
    return { entries, storage: "kv" };
  }
  const entries = (memStore().get(key) ?? []).map(normalizeEntry);
  return { entries, storage: "memory" };
}

async function writeRaw(
  dayKey: string,
  entries: LeaderboardEntry[],
  storage: "kv" | "memory"
): Promise<void> {
  const key = KEY_PREFIX + dayKey;
  const payload = sortEntries(entries).slice(0, MAX_ENTRIES);
  if (storage === "kv" && kvConfigured()) {
    await kvCommand("SET", key, JSON.stringify(payload));
    await kvCommand("EXPIRE", key, 60 * 60 * 72);
    return;
  }
  memStore().set(key, payload);
}

async function ensureSeeded(
  dayKey: string,
  storage: "kv" | "memory",
  entries: LeaderboardEntry[]
): Promise<LeaderboardEntry[]> {
  if (!demoLeaderboardAllowed()) {
    return entries.filter((e) => !e.demo);
  }
  if (entries.length > 0) return entries;
  const mark = `${storage}:${dayKey}`;
  const seeds = demoEntriesForDay(dayKey);
  if (!seededDays().has(mark)) {
    seededDays().add(mark);
    try {
      await writeRaw(dayKey, seeds, storage);
    } catch (e) {
      console.error("Failed to persist demo seeds", e);
    }
  }
  return seeds;
}

export async function getDailyBoard(
  dayKey: string = laDayKey()
): Promise<LeaderboardPayload> {
  const { entries: stored, storage } = await readRaw(dayKey);
  const ensured = await ensureSeeded(dayKey, storage, stored);
  const entries = mergeWithSeeds(dayKey, ensured);
  const demo = demoLeaderboardAllowed() && entries.some((e) => e.demo);
  return {
    dayKey,
    entries: sortEntries(entries).slice(0, MAX_ENTRIES),
    storage,
    demo,
  };
}

export async function submitScore(
  entry: Omit<LeaderboardEntry, "at" | "dayKey" | "demo"> & {
    dayKey?: string;
    country?: string;
  }
): Promise<LeaderboardPayload> {
  const dayKey = entry.dayKey ?? laDayKey();
  const full: LeaderboardEntry = {
    nick: entry.nick,
    emoji: entry.emoji,
    score: entry.score,
    reps: entry.reps,
    dayKey,
    at: Date.now(),
    country: normalizeCountry(entry.country),
    demo: false,
  };

  const { entries: stored, storage } = await readRaw(dayKey);
  let base = stored.filter((e) => (demoLeaderboardAllowed() ? true : !e.demo));
  if (base.length === 0 && demoLeaderboardAllowed()) {
    base = demoEntriesForDay(dayKey);
  }

  const nickKey = full.nick.toLowerCase();
  let entries = base.filter((e) => e.nick.toLowerCase() !== nickKey);
  entries.push(full);
  entries = mergeWithSeeds(dayKey, entries);
  entries = sortEntries(entries).slice(0, MAX_ENTRIES);
  const toPersist = demoLeaderboardAllowed()
    ? entries
    : entries.filter((e) => !e.demo);
  await writeRaw(dayKey, toPersist, storage);
  const demo = demoLeaderboardAllowed() && entries.some((e) => e.demo);
  return { dayKey, entries, storage, demo };
}

export async function countRealEntries(
  dayKey: string = laDayKey()
): Promise<{ count: number; storage: "kv" | "memory" }> {
  const { entries, storage } = await readRaw(dayKey);
  const count = entries.filter((e) => !e.demo).length;
  return { count, storage };
}

export function allowRequest(
  id: string,
  limit: number,
  windowMs: number
): boolean {
  const store = rateLimitStore();
  const now = Date.now();
  const prev = (store.get(id) ?? []).filter((t) => now - t < windowMs);
  if (prev.length >= limit) {
    store.set(id, prev);
    return false;
  }
  prev.push(now);
  store.set(id, prev);
  return true;
}

export function sanitizeNick(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, 16);
  if (trimmed.length < 2) return null;
  if (!/^[\p{L}\p{N} _.\-']+$/u.test(trimmed)) return null;
  return trimmed;
}

export function sanitizeEmoji(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "🦵";
  const e = [...raw.trim()].slice(0, 4).join("");
  return e || "🦵";
}

export function clampScore(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const v = Math.floor(n);
  if (v < 0 || v > 9999) return null;
  return v;
}

export const LEADERBOARD_KEY_PREFIX = KEY_PREFIX;
