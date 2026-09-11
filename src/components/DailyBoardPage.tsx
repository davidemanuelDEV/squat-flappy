"use client";

import { useCallback, useEffect, useState } from "react";
import { laDayKey } from "@/lib/daily";
import type { LeaderboardEntry } from "@/lib/leaderboard-store";
import { LeaderboardPanel } from "@/components/GamePanels";

/** Camera-free daily board. Never imports MediaPipe / getUserMedia. */
export default function DailyBoardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [storage, setStorage] = useState<"kv" | "memory" | null>(null);
  const [dayKey, setDayKey] = useState(laDayKey());

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const day = laDayKey();
      setDayKey(day);
      const res = await fetch(
        `/api/leaderboard?day=${encodeURIComponent(day)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`Board error ${res.status}`);
      const data = (await res.json()) as {
        dayKey: string;
        entries: LeaderboardEntry[];
        storage: "kv" | "memory";
        demo?: boolean;
      };
      setEntries(data.entries ?? []);
      setStorage(data.storage);
      setDayKey(data.dayKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load board");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  return (
    <LeaderboardPanel
      open
      variant="page"
      allowSubmit={false}
      playHref="/play"
      dayKey={dayKey}
      entries={entries}
      storage={storage}
      loading={loading}
      error={error}
      nick=""
      emoji="🦵"
      score={0}
      reps={0}
      submitting={false}
      submitMsg={null}
      onNick={() => {}}
      onEmoji={() => {}}
      onClose={() => {}}
      onRefresh={() => void loadBoard()}
      onSubmit={() => {}}
    />
  );
}
