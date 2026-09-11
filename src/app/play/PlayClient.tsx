"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect } from "react";
import PlaySplash from "@/components/PlaySplash";

const SquatFlappyGame = dynamic(() => import("@/components/SquatFlappyGame"), {
  ssr: false,
  loading: () => <PlaySplash label="Loading game…" />,
});

export default function PlayClient() {
  useEffect(() => {
    document.body.classList.add("play-lock");
    return () => {
      document.body.classList.remove("play-lock");
    };
  }, []);

  return (
    <Suspense fallback={<PlaySplash label="Loading game…" />}>
      <SquatFlappyGame />
    </Suspense>
  );
}
