import { NextRequest, NextResponse } from "next/server";
import { laDayKey } from "@/lib/daily";
import {
  allowRequest,
  countRealEntries,
  demoLeaderboardAllowed,
  kvConfigured,
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
  if (!allowRequest(`stats:${id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const day = req.nextUrl.searchParams.get("day")?.trim() || laDayKey();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  }

  const board = await countRealEntries(day);
  const storage: "kv" | "memory" = kvConfigured() ? "kv" : "memory";

  return NextResponse.json(
    {
      dayKey: day,
      boardEntriesToday: board.count,
      storage,
      demoAllowed: demoLeaderboardAllowed(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
