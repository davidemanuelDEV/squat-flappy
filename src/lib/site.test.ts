import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APP_TAGLINE,
  CAM_SETUP_HINT,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_PATH,
  OG_IMAGE_WIDTH,
  SIBLING_LANDING_LINE,
  SIBLING_NAME,
  SIBLING_ORIGIN,
  SIBLING_PLAY_URL,
  SIBLING_PROMO_LINE,
  ogImageUrl,
  servingOrigin,
  siteOrigin,
} from "./site";
import { LEADERBOARD_KEY_PREFIX } from "./leaderboard-store";
import { playUrl } from "./share";

describe("site origin + board keys", () => {
  it("defaults to squatflappy.com and never pushflappy.com", () => {
    assert.equal(
      siteOrigin({ NEXT_PUBLIC_SITE_ORIGIN: "https://squat-flappy.vercel.app/" }),
      "https://squat-flappy.vercel.app"
    );
    assert.equal(siteOrigin({}), "https://squatflappy.com");
    assert.ok(!siteOrigin({}).includes("pushflappy.com"));
  });

  it("serving origin uses squatflappy.com in production, not the Vercel alias", () => {
    assert.equal(
      servingOrigin({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "squat-flappy.vercel.app",
        VERCEL_URL: "squat-flappy.vercel.app",
      }),
      "https://squatflappy.com"
    );
    assert.equal(
      servingOrigin({
        VERCEL_PROJECT_PRODUCTION_URL: "squat-flappy.vercel.app",
      }),
      "https://squatflappy.com"
    );
    assert.equal(servingOrigin({}), "https://squatflappy.com");
    assert.ok(
      !servingOrigin({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "squat-flappy.vercel.app",
      }).includes("pushflappy.com")
    );
  });

  it("serving origin uses the preview host on preview deployments", () => {
    assert.equal(
      servingOrigin({
        VERCEL_ENV: "preview",
        VERCEL_URL: "squat-flappy-abc.vercel.app",
        VERCEL_PROJECT_PRODUCTION_URL: "squat-flappy.vercel.app",
      }),
      "https://squat-flappy-abc.vercel.app"
    );
    assert.equal(
      servingOrigin({ VERCEL_ENV: "preview" }),
      "https://squatflappy.com"
    );
  });

  it("NEXT_PUBLIC_SITE_ORIGIN overrides serving origin in every environment", () => {
    assert.equal(
      servingOrigin({
        NEXT_PUBLIC_SITE_ORIGIN: "https://custom.example/",
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "squat-flappy.vercel.app",
      }),
      "https://custom.example"
    );
    assert.equal(
      servingOrigin({
        NEXT_PUBLIC_SITE_ORIGIN: "https://custom.example/",
        VERCEL_ENV: "preview",
        VERCEL_URL: "squat-flappy-abc.vercel.app",
      }),
      "https://custom.example"
    );
  });

  it("prefixes KV keys so they cannot mix with the push board", () => {
    assert.equal(LEADERBOARD_KEY_PREFIX, "squat-flappy:lb:");
    assert.ok(!LEADERBOARD_KEY_PREFIX.includes("push-flappy"));
  });

  it("recommends chest-height camera setup, not eye height", () => {
    assert.match(CAM_SETUP_HINT, /chest height/i);
    assert.match(APP_TAGLINE, /chest-height/i);
    assert.doesNotMatch(CAM_SETUP_HINT, /eye height/i);
    assert.doesNotMatch(APP_TAGLINE, /eye height/i);
    assert.ok(!siteOrigin({}).includes("pushflappy.com"));
  });

  it("keeps a sibling play URL on pushflappy.com", () => {
    assert.equal(SIBLING_NAME, "Push Flappy");
    assert.equal(SIBLING_ORIGIN, "https://pushflappy.com");
    assert.equal(SIBLING_PLAY_URL, "https://pushflappy.com/play");
    assert.equal(
      SIBLING_PROMO_LINE,
      "Legs smoked? Push day → pushflappy.com"
    );
    assert.equal(SIBLING_LANDING_LINE, "Also play Push Flappy");
    assert.ok(!siteOrigin({}).includes("pushflappy.com"));
    assert.ok(!servingOrigin({}).includes("pushflappy.com"));
  });

  it("builds OG unfurl URLs on /api/og via servingOrigin, never /og.png", () => {
    assert.equal(OG_IMAGE_PATH, "/api/og");
    assert.equal(OG_IMAGE_WIDTH, 1200);
    assert.equal(OG_IMAGE_HEIGHT, 630);
    assert.equal(ogImageUrl({ origin: siteOrigin({}) }), "https://squatflappy.com/api/og");
    assert.equal(
      ogImageUrl({
        origin: servingOrigin({
          VERCEL_ENV: "production",
          VERCEL_PROJECT_PRODUCTION_URL: "squat-flappy.vercel.app",
        }),
      }),
      "https://squatflappy.com/api/og"
    );
    assert.equal(
      ogImageUrl({
        beat: 12,
        reps: 8,
        origin: servingOrigin({
          VERCEL_ENV: "preview",
          VERCEL_URL: "squat-flappy-abc.vercel.app",
        }),
      }),
      "https://squat-flappy-abc.vercel.app/api/og?beat=12&reps=8"
    );
    assert.ok(!ogImageUrl({ origin: siteOrigin({}) }).includes("/og.png"));
    assert.ok(!ogImageUrl({ origin: siteOrigin({}) }).includes("pushflappy.com"));
  });

  it("builds beat-me links on /play?beat=N", () => {
    assert.equal(
      playUrl({ beat: 15, origin: siteOrigin({}) }),
      "https://squatflappy.com/play?beat=15"
    );
    const url = playUrl({
      beat: 21,
      reps: 8,
      origin: "https://squat-flappy.vercel.app",
    });
    assert.equal(
      url,
      "https://squat-flappy.vercel.app/play?beat=21&reps=8"
    );
    assert.ok(!url.includes("pushflappy.com"));
  });
});
