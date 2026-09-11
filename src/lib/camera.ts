/** Camera + local high-score helpers */
import { HIGH_SCORE_KEY } from "./constants";

export function loadHighScore(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(localStorage.getItem(HIGH_SCORE_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

export function saveHighScore(n: number) {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(n));
  } catch {
    /* ignore */
  }
}

export function cameraConstraints(): MediaTrackConstraints {
  const narrow =
    typeof window !== "undefined" &&
    Math.min(window.innerWidth, window.innerHeight) < 700;
  return {
    facingMode: "user",
    width: { ideal: narrow ? 640 : 1280 },
    height: { ideal: narrow ? 480 : 720 },
  };
}
