"use client";

import { GeometricBird } from "@/components/BrandMark";
import { track } from "@/lib/analytics";
import { SIBLING_LANDING_LINE, SIBLING_ORIGIN } from "@/lib/site";

export type SiblingPromoSurface = "landing" | "play_ready";

export function SiblingPromoPill({
  surface,
}: {
  surface: SiblingPromoSurface;
}) {
  return (
    <a
      href={SIBLING_ORIGIN}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() =>
        track("sibling_click", {
          placement: "promo_pill",
          surface,
          sibling: "push-flappy",
        })
      }
      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-lime-300/80 bg-lime-400/20 px-4 text-sm font-semibold text-lime-50 shadow-[0_0_0_1px_rgba(163,230,53,0.18)] hover:border-lime-200 hover:bg-lime-400/30"
    >
      <span className="inline-flex shrink-0" aria-hidden>
        <GeometricBird width={20} height={16} idPrefix="sf-pill" />
      </span>
      {SIBLING_LANDING_LINE}
    </a>
  );
}
