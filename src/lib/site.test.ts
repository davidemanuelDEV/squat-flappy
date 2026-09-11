import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SIBLING_NAME,
  SIBLING_ORIGIN,
  SIBLING_PLAY_URL,
  SIBLING_PROMO_LINE,
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

  it("serving origin uses the live Vercel host when canonical DNS is not set", () => {
    assert.equal(
      servingOrigin({
        VERCEL_PROJECT_PRODUCTION_URL: "squat-flappy.vercel.app",
      }),
      "https://squat-flappy.vercel.app"
    );
    assert.equal(
      servingOrigin({ VERCEL_URL: "squat-flappy-abc.vercel.app" }),
      "https://squat-flappy-abc.vercel.app"
    );
    assert.equal(servingOrigin({}), "https://squatflappy.com");
    assert.ok(
      !servingOrigin({
        VERCEL_PROJECT_PRODUCTION_URL: "squat-flappy.vercel.app",
      }).includes("pushflappy.com")
    );
  });

  it("prefixes KV keys so they cannot mix with the push board", () => {
    assert.equal(LEADERBOARD_KEY_PREFIX, "squat-flappy:lb:");
    assert.ok(!LEADERBOARD_KEY_PREFIX.includes("push-flappy"));
  });

  it("keeps a sibling play URL on pushflappy.com", () => {
    assert.equal(SIBLING_NAME, "Push Flappy");
    assert.equal(SIBLING_ORIGIN, "https://pushflappy.com");
    assert.equal(SIBLING_PLAY_URL, "https://pushflappy.com/play");
    assert.equal(
      SIBLING_PROMO_LINE,
      "Legs smoked? Push day → pushflappy.com"
    );
    assert.ok(!siteOrigin({}).includes("pushflappy.com"));
    assert.ok(!servingOrigin({}).includes("pushflappy.com"));
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
