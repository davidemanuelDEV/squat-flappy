import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LEADERBOARD_BLOB_PREFIX,
  LEADERBOARD_KEY_PREFIX,
  blobConfigured,
  blobPathname,
  getDailyBoard,
  kvConfigured,
  persistConfigured,
  resolveKvRestConfig,
  resolveStorage,
  setBlobIOForTests,
  submitScore,
} from "./leaderboard-store";

function restoreEnv(
  key: "BLOB_READ_WRITE_TOKEN" | "KV_REST_API_URL" | "KV_REST_API_TOKEN" | "UPSTASH_REDIS_REST_URL" | "UPSTASH_REDIS_REST_TOKEN",
  prev: string | undefined
): void {
  if (prev === undefined) delete process.env[key];
  else process.env[key] = prev;
}

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
    assert.equal(blobConfigured({}), false);
    assert.equal(persistConfigured({}), false);
    assert.equal(resolveStorage({}), "memory");
  });

  it("keeps the squat-flappy key and blob prefixes", () => {
    assert.equal(LEADERBOARD_KEY_PREFIX, "squat-flappy:lb:");
    assert.equal(LEADERBOARD_BLOB_PREFIX, "squat-flappy/lb/");
    assert.equal(blobPathname("2026-09-11"), "squat-flappy/lb/2026-09-11.json");
    assert.ok(!blobPathname("2026-09-11").includes("push-flappy"));
  });

  it("prefers blob over KV when BLOB_READ_WRITE_TOKEN is set", () => {
    assert.equal(
      resolveStorage({
        BLOB_READ_WRITE_TOKEN: "blob-token",
        KV_REST_API_URL: "https://kv.example",
        KV_REST_API_TOKEN: "kv-token",
      }),
      "blob"
    );
    assert.equal(blobConfigured({ BLOB_READ_WRITE_TOKEN: "blob-token" }), true);
    assert.equal(persistConfigured({ BLOB_READ_WRITE_TOKEN: "blob-token" }), true);
    assert.equal(
      resolveStorage({
        KV_REST_API_URL: "https://kv.example",
        KV_REST_API_TOKEN: "kv-token",
      }),
      "kv"
    );
  });

  it("talks Upstash REST when only UPSTASH_REDIS_REST_* is set", async () => {
    const prev = {
      blob: process.env.BLOB_READ_WRITE_TOKEN,
      upUrl: process.env.UPSTASH_REDIS_REST_URL,
      upToken: process.env.UPSTASH_REDIS_REST_TOKEN,
      kvUrl: process.env.KV_REST_API_URL,
      kvToken: process.env.KV_REST_API_TOKEN,
      fetch: globalThis.fetch,
    };
    delete process.env.BLOB_READ_WRITE_TOKEN;
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
      restoreEnv("BLOB_READ_WRITE_TOKEN", prev.blob);
      restoreEnv("UPSTASH_REDIS_REST_URL", prev.upUrl);
      restoreEnv("UPSTASH_REDIS_REST_TOKEN", prev.upToken);
      restoreEnv("KV_REST_API_URL", prev.kvUrl);
      restoreEnv("KV_REST_API_TOKEN", prev.kvToken);
    }
  });

  it("persists a private JSON blob when BLOB_READ_WRITE_TOKEN is set", async () => {
    const prev = {
      blob: process.env.BLOB_READ_WRITE_TOKEN,
      upUrl: process.env.UPSTASH_REDIS_REST_URL,
      upToken: process.env.UPSTASH_REDIS_REST_TOKEN,
      kvUrl: process.env.KV_REST_API_URL,
      kvToken: process.env.KV_REST_API_TOKEN,
    };
    process.env.BLOB_READ_WRITE_TOKEN = "blob-token";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;

    const blobs = new Map<string, string>();
    const puts: string[] = [];
    setBlobIOForTests({
      async get(pathname) {
        const raw = blobs.get(pathname);
        if (!raw) return null;
        return {
          statusCode: 200,
          stream: new Blob([raw]).stream(),
        };
      },
      async put(pathname, body) {
        puts.push(pathname);
        blobs.set(pathname, body);
      },
    });

    try {
      const board = await getDailyBoard("2026-09-11");
      assert.equal(board.storage, "blob");

      const posted = await submitScore({
        nick: "Anon",
        emoji: "🦵",
        score: 9,
        reps: 6,
        dayKey: "2026-09-11",
        country: "US",
      });
      assert.equal(posted.storage, "blob");
      assert.ok(posted.entries.some((e) => e.nick === "Anon" && e.score === 9));
      assert.ok(puts.length >= 1);
      assert.ok(puts.every((p) => p === "squat-flappy/lb/2026-09-11.json"));
      const raw = blobs.get("squat-flappy/lb/2026-09-11.json");
      assert.ok(raw);
      assert.ok(raw.includes("Anon"));
      assert.ok(!raw.includes("push-flappy"));
    } finally {
      setBlobIOForTests(null);
      restoreEnv("BLOB_READ_WRITE_TOKEN", prev.blob);
      restoreEnv("UPSTASH_REDIS_REST_URL", prev.upUrl);
      restoreEnv("UPSTASH_REDIS_REST_TOKEN", prev.upToken);
      restoreEnv("KV_REST_API_URL", prev.kvUrl);
      restoreEnv("KV_REST_API_TOKEN", prev.kvToken);
    }
  });
});
