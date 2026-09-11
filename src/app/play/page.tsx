import type { Metadata } from "next";
import PlayClient from "./PlayClient";
import {
  APP_NAME,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  ogImageUrl,
  servingOrigin,
} from "@/lib/site";

type PlaySearch = {
  beat?: string | string[];
  reps?: string | string[];
};

function first(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function parseNonNegInt(raw: string | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<PlaySearch>;
}): Promise<Metadata> {
  const site = servingOrigin();
  const sp = await searchParams;
  const beat = parseNonNegInt(first(sp.beat));
  const reps = parseNonNegInt(first(sp.reps));
  const ogImage =
    beat == null
      ? ogImageUrl({ origin: site })
      : ogImageUrl({
          origin: site,
          beat,
          reps: reps ?? undefined,
        });

  if (beat == null) {
    return {
      title: `Play — ${APP_NAME}`,
      description:
        "Play Squat Flappy with air squats. Chest-height camera + on-device pose. Challenge friends with beat-me links.",
      openGraph: {
        title: `Play — ${APP_NAME}`,
        description:
          "Play Squat Flappy with air squats. Chest-height camera + on-device pose. Challenge friends with beat-me links.",
        url: `${site}/play`,
        type: "website",
        siteName: APP_NAME,
        images: [
          {
            url: ogImage,
            width: OG_IMAGE_WIDTH,
            height: OG_IMAGE_HEIGHT,
            alt: APP_NAME,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `Play — ${APP_NAME}`,
        description:
          "Play Squat Flappy with air squats. Chest-height camera + on-device pose. Challenge friends with beat-me links.",
        images: [ogImage],
      },
    };
  }

  const repsBit = reps != null && reps > 0 ? ` · ${reps} squats` : "";
  const title = `Beat my ${beat} on ${APP_NAME}`;
  const description = `Think you can beat ${beat}${repsBit}? Open the link, cam at chest height, start in a squat, and clear more steel gates.`;
  const playUrl = new URL("/play", site);
  playUrl.searchParams.set("beat", String(beat));
  if (reps != null && reps > 0) playUrl.searchParams.set("reps", String(reps));

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: playUrl.toString(),
      type: "website",
      siteName: APP_NAME,
      images: [
        {
          url: ogImage,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function PlayPage() {
  return <PlayClient />;
}
