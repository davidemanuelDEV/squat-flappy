import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LEADERBOARD_KEY_PREFIX,
  kvConfigured,
  resolveKvRestConfig,
} from "./leaderboard-store";

describe("kv rest env aliases", () => {
  it("prefers KV_REST_API_* when that pair is complete", () => {
    const cfg = resolveKvRestConfig({
      KV_REST_API_URL: "https://kv.example",
      KV_REST_API_TOKEN: "kv-token",
      UPSTASH_REDIS_REST_URL: "https://upstash.example",
      UPSTASH_REDIS_REST_TOKEN: "up-token",
    });
    assert.deepEqual(cfg, {
      url: "https://kv.example",
      token: "kv-token",
    });
    assert.equal(
      kvConfigured({
        KV_REST_API_URL: "https://kv.example",
        KV_REST_API_TOKEN: "kv-token",
      }),
      true
    );
  });

  it("accepts UPSTASH_REDIS_REST_* as the same REST pair", () => {
    const cfg = resolveKvRestConfig({
      UPSTASH_REDIS_REST_URL: "https://upstash.example",
      UPSTASH_REDIS_REST_TOKEN: "up-token",
    });
    assert.deepEqual(cfg, {
      url: "https://upstash.example",
      token: "up-token",
    });
    assert.equal(
      kvConfigured({
        UPSTASH_REDIS_REST_URL: "https://upstash.example",
        UPSTASH_REDIS_REST_TOKEN: "up-token",
      }),
      true
    );
  });

  it("ignores incomplete pairs and stays on memory", () => {
    assert.equal(
      resolveKvRestConfig({ KV_REST_API_URL: "https://kv.example" }),
      null
    );
    assert.equal(
      resolveKvRestConfig({ UPSTASH_REDIS_REST_TOKEN: "up-token" }),
      null
    );
    assert.equal(resolveKvRestConfig({}), null);
    assert.equal(kvConfigured({}), false);
  });

  it("keeps the squat-flappy key prefix", () => {
    assert.equal(LEADERBOARD_KEY_PREFIX, "squat-flappy:lb:");
  });
});
