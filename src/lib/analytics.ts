"use client";

import { track as vercelTrack } from "@vercel/analytics";

export type GrowthEvent =
  | "play_start"
  | "play_wipeout"
  | "challenge_open"
  | "share_click"
  | "board_submit"
  | "sibling_click";

export type ShareChannel = "wa" | "x" | "copy" | "native" | "card" | "primary";

export function track(
  event: GrowthEvent,
  props?: Record<string, string | number | boolean | null | undefined>
): void {
  try {
    const cleaned: Record<string, string | number | boolean> = {};
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v === undefined || v === null) continue;
        cleaned[k] = v;
      }
    }
    vercelTrack(event, cleaned);
  } catch {
    /* analytics must never break play */
  }
}
