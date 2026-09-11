import { NextRequest, NextResponse } from "next/server";
import { detectCountryFromHeaders } from "@/lib/country";
import { laDayKey } from "@/lib/daily";
import {
  allowRequest,
  clampScore,
  getDailyBoard,
  sanitizeEmoji,
  sanitizeNick,
  submitScore,
} from "@/lib/leaderboard-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientId(req: NextRequest): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

export async function GET(req: NextRequest) {
  const id = clientId(req);
  if (!allowRequest(`get:${id}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const day = req.nextUrl.searchParams.get("day")?.trim() || laDayKey();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  }
  const board = await getDailyBoard(day);
  return NextResponse.json(board, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: NextRequest) {
  const id = clientId(req);
  if (!allowRequest(`post:${id}`, 12, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const nick = sanitizeNick(b.nick);
  if (!nick) {
    return NextResponse.json(
      { error: "Nick must be 2–16 letters/numbers" },
      { status: 400 }
    );
  }
  const score = clampScore(b.score);
  if (score == null) {
    return NextResponse.json({ error: "Invalid score" }, { status: 400 });
  }
  const reps = clampScore(b.reps) ?? 0;
  const emoji = sanitizeEmoji(b.emoji);
  const dayKey =
    typeof b.dayKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.dayKey)
      ? b.dayKey
      : laDayKey();

  if (dayKey !== laDayKey()) {
    return NextResponse.json(
      { error: "Can only submit for today's board" },
      { status: 400 }
    );
  }

  const country = detectCountryFromHeaders(req.headers);

  const board = await submitScore({
    nick,
    emoji,
    score,
    reps,
    dayKey,
    country,
  });
  return NextResponse.json(board);
}
