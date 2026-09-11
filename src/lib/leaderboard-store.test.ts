import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LEADERBOARD_KEY_PREFIX,
  getDailyBoard,
  kvConfigured,
  resolveKvRestConfig,
  submitScore,
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

  it("talks Upstash REST when only UPSTASH_REDIS_REST_* is set", async () => {
    const prev = {
      upUrl: process.env.UPSTASH_REDIS_REST_URL,
      upToken: process.env.UPSTASH_REDIS_REST_TOKEN,
      kvUrl: process.env.KV_REST_API_URL,
      kvToken: process.env.KV_REST_API_TOKEN,
      fetch: globalThis.fetch,
    };
    process.env.UPSTASH_REDIS_REST_URL = "https://upstash.example";
    process.env.UPSTASH_REDIS_REST_TOKEN = "up-token";
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;

    const calls: { url: string; cmd: string; key?: string; auth: string | null }[] =
      [];
    let stored: string | null = null;
    globalThis.fetch = async (input, init) => {
      const body = init?.body ? JSON.parse(String(init.body)) : [];
      const [cmd, key, value] = body as [string, string?, string?];
      const auth = new Headers(init?.headers).get("authorization");
      calls.push({ url: String(input), cmd, key, auth });
      if (cmd === "GET") {
        return new Response(JSON.stringify({ result: stored }), { status: 200 });
      }
      if (cmd === "SET") {
        stored = value ?? null;
        return new Response(JSON.stringify({ result: "OK" }), { status: 200 });
      }
      return new Response(JSON.stringify({ result: 1 }), { status: 200 });
    };

    try {
      const board = await getDailyBoard("2026-09-11");
      assert.equal(board.storage, "kv");
      assert.equal(calls[0]?.url, "https://upstash.example");
      assert.equal(calls[0]?.cmd, "GET");
      assert.equal(calls[0]?.auth, "Bearer up-token");
      assert.equal(calls[0]?.key, `${LEADERBOARD_KEY_PREFIX}2026-09-11`);

      const posted = await submitScore({
        nick: "Anon",
        emoji: "🦵",
        score: 3,
        reps: 2,
        dayKey: "2026-09-11",
        country: "US",
      });
      assert.equal(posted.storage, "kv");
      assert.ok(posted.entries.some((e) => e.nick === "Anon" && e.score === 3));
      assert.ok(calls.some((c) => c.cmd === "SET"));
      assert.ok(calls.every((c) => c.url === "https://upstash.example"));
    } finally {
      globalThis.fetch = prev.fetch;
      if (prev.upUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
      else process.env.UPSTASH_REDIS_REST_URL = prev.upUrl;
      if (prev.upToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
      else process.env.UPSTASH_REDIS_REST_TOKEN = prev.upToken;
      if (prev.kvUrl === undefined) delete process.env.KV_REST_API_URL;
      else process.env.KV_REST_API_URL = prev.kvUrl;
      if (prev.kvToken === undefined) delete process.env.KV_REST_API_TOKEN;
      else process.env.KV_REST_API_TOKEN = prev.kvToken;
    }
  });
});
