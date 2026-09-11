/**
 * Calendar-day helpers in America/Los_Angeles for comparable daily boards.
 */

const TZ = "America/Los_Angeles";

/** YYYY-MM-DD in America/Los_Angeles for a given instant (default: now). */
export function laDayKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Seed string for today's gate RNG — sibling-prefixed, never push-flappy. */
export function dailyPipeSeed(dayKey: string = laDayKey()): string {
  return `squat-flappy-pipes:${dayKey}`;
}

export const DAILY_TZ_LABEL = "PT (America/Los_Angeles)";
