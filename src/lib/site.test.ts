import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { siteOrigin } from "./site";
import { LEADERBOARD_KEY_PREFIX } from "./leaderboard-store";
import { playUrl } from "./share";

describe("site origin + board keys", () => {
  it("prefers NEXT_PUBLIC_SITE_ORIGIN and never defaults to pushflappy.com", () => {
    assert.equal(
      siteOrigin({ NEXT_PUBLIC_SITE_ORIGIN: "https://squat-flappy.vercel.app/" }),
      "https://squat-flappy.vercel.app"
    );
    assert.equal(
      siteOrigin({ VERCEL_PROJECT_PRODUCTION_URL: "squat-example.vercel.app" }),
      "https://squat-example.vercel.app"
    );
    assert.equal(siteOrigin({}), "http://localhost:3000");
    assert.ok(!siteOrigin({}).includes("pushflappy.com"));
  });

  it("prefixes KV keys so they cannot mix with the push board", () => {
    assert.equal(LEADERBOARD_KEY_PREFIX, "squat-flappy:lb:");
    assert.ok(!LEADERBOARD_KEY_PREFIX.includes("push-flappy"));
  });

  it("builds beat-me links on /play?beat=N", () => {
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
