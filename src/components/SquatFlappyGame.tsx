"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { EMOJI_KEY, MEDIAPIPE_WASM, NICK_KEY, POSE_MODEL } from "@/lib/constants";
import { cameraConstraints, loadHighScore, saveHighScore } from "@/lib/camera";
import {
  createInitialState,
  startGame,
  tick,
  birdRadius,
  birdX,
  type GameState,
} from "@/lib/game";
import { laDayKey } from "@/lib/daily";
import { track } from "@/lib/analytics";
import {
  mapNormToBirdY,
  PoseTracker,
  type CalibPhase,
  type Landmark,
} from "@/lib/pose";
import { drawBird, drawHud, drawPipes, drawPlayfield } from "@/lib/draw";
import {
  createCrashBurst,
  drawCrash,
  pickWipeoutLine,
  tickCrash,
  type CrashBurst,
} from "@/lib/crash";
import {
  buildSharePayload,
  downloadShareCard,
  openShareWindow,
  parseBeatFromSearch,
  renderShareCard,
  shareCardFile,
  shareOrCopy,
  whatsappShareUrl,
  xIntentUrl,
  copyToClipboard,
} from "@/lib/share";
import type { LeaderboardEntry } from "@/lib/leaderboard-store";
import {
  CoachBanner,
  CountdownOverlay,
  GameOverPanel,
  LeaderboardPanel,
  OrientationTip,
  ReadyPanel,
} from "@/components/GamePanels";
import PlaySplash from "@/components/PlaySplash";
import { CAM_SETUP_HINT } from "@/lib/site";

type CamStatus = "idle" | "requesting" | "ready" | "error" | "denied";

export default function SquatFlappyGame() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const beatChallenge = parseBeatFromSearch(searchParams);
  const beatTarget = beatChallenge?.score ?? null;
  const boardDeepLink = searchParams.get("board") === "1";

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const trackerRef = useRef(new PoseTracker());
  const gameRef = useRef<GameState | null>(null);
  const lastTsRef = useRef(0);
  const lastBirdYRef = useRef(0);
  const rafRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const runningRef = useRef(true);
  const beatTargetRef = useRef<number | null>(beatTarget);
  const victoryFiredRef = useRef(false);
  const lastPoseSampleRef = useRef({
    hasPose: false,
    squatDepth: 0.5,
    reps: 0,
    calibPhase: "waiting" as CalibPhase,
    holdProgress: 0,
    mappedNorm: 0.5,
    kneesVisible: false,
  });

  const [camStatus, setCamStatus] = useState<CamStatus>("idle");
  const [modelReady, setModelReady] = useState(false);
  const [hasPose, setHasPose] = useState(false);
  const [calibPhase, setCalibPhase] = useState<CalibPhase>("waiting");
  const [holdProgress, setHoldProgress] = useState(0);
  const [ui, setUi] = useState({
    status: "ready" as GameState["status"],
    score: 0,
    highScore: 0,
    reps: 0,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showOrientationTip, setShowOrientationTip] = useState(false);
  const [wipeoutLine, setWipeoutLine] = useState<string | null>(null);
  const [beatVictory, setBeatVictory] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const crashRef = useRef<CrashBurst | null>(null);
  const pendingWipeoutRef = useRef<string | null>(null);
  const lastWipeoutRef = useRef<string | null>(null);

  const [boardOpen, setBoardOpen] = useState(false);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [boardEntries, setBoardEntries] = useState<LeaderboardEntry[]>([]);
  const [boardStorage, setBoardStorage] = useState<"kv" | "memory" | null>(null);
  const [boardDay, setBoardDay] = useState(laDayKey());
  const [nick, setNick] = useState("Anon");
  const [emoji, setEmoji] = useState("🦵");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  useEffect(() => {
    beatTargetRef.current = beatTarget;
    victoryFiredRef.current = false;
    setBeatVictory(false);
  }, [beatTarget]);

  useEffect(() => {
    if (beatTarget != null && beatTarget >= 0) {
      track("challenge_open", { beat: beatTarget });
    }
  }, [beatTarget]);

  useEffect(() => {
    try {
      const n = localStorage.getItem(NICK_KEY);
      const e = localStorage.getItem(EMOJI_KEY);
      if (n) setNick(n);
      if (e) setEmoji(e);
    } catch {
      /* ignore */
    }
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const hs = gameRef.current?.highScore ?? loadHighScore();
    const day = laDayKey();
    if (!gameRef.current || gameRef.current.status === "ready") {
      gameRef.current = createInitialState(w, h, hs, day);
    } else {
      gameRef.current = { ...gameRef.current, width: w, height: h };
    }
  }, []);

  useEffect(() => {
    const update = () => {
      const portrait = window.matchMedia("(orientation: portrait)").matches;
      const narrow = window.innerWidth < 768;
      setShowOrientationTip(portrait && narrow);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  const stopCameraStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
  }, []);

  useEffect(() => {
    if (!boardDeepLink) return;
    router.replace("/board");
  }, [boardDeepLink, router]);

  useEffect(() => {
    if (boardDeepLink || boardOpen) {
      stopCameraStream();
      if (boardOpen || boardDeepLink) setCamStatus("idle");
      return;
    }
    let cancelled = false;
    async function initCam() {
      setCamStatus("requesting");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: cameraConstraints(),
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        setCamStatus("ready");
      } catch (e) {
        const name = e instanceof DOMException ? e.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setCamStatus("denied");
          setErrorMsg("Camera permission denied. Allow camera access and reload.");
        } else {
          setCamStatus("error");
          setErrorMsg(e instanceof Error ? e.message : "Could not open camera.");
        }
      }
    }
    void initCam();
    return () => {
      cancelled = true;
      stopCameraStream();
    };
  }, [boardOpen, boardDeepLink, stopCameraStream]);

  useEffect(() => {
    if (boardDeepLink || boardOpen) return;
    let cancelled = false;
    async function initPose() {
      if (landmarkerRef.current) {
        setModelReady(true);
        return;
      }
      try {
        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
        if (cancelled) return;
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: POSE_MODEL, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setModelReady(true);
      } catch (e) {
        console.error("Pose model failed (trying CPU)", e);
        try {
          const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
          if (cancelled) return;
          const landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: POSE_MODEL, delegate: "CPU" },
            runningMode: "VIDEO",
            numPoses: 1,
          });
          if (cancelled) {
            landmarker.close();
            return;
          }
          landmarkerRef.current = landmarker;
          setModelReady(true);
        } catch (e2) {
          console.error(e2);
          setErrorMsg(
            "Failed to load pose model. Check network access to Google CDN / jsDelivr."
          );
        }
      }
    }
    void initPose();
    return () => {
      cancelled = true;
    };
  }, [boardOpen, boardDeepLink]);

  useEffect(() => {
    return () => {
      stopCameraStream();
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, [stopCameraStream]);

  useEffect(() => {
    resizeCanvas();
    const ro = new ResizeObserver(() => resizeCanvas());
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("orientationchange", resizeCanvas);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", resizeCanvas);
    };
  }, [resizeCanvas]);

  useEffect(() => {
    const id = setInterval(() => {
      const g = gameRef.current;
      const sample = lastPoseSampleRef.current;
      if (!g) return;
      setUi({
        status: g.status,
        score: g.score,
        highScore: g.highScore,
        reps: sample.reps,
      });
      setHasPose(sample.hasPose);
      setCalibPhase(sample.calibPhase);
      setHoldProgress(sample.holdProgress);
      if (pendingWipeoutRef.current != null) {
        const line = pendingWipeoutRef.current;
        pendingWipeoutRef.current = null;
        lastWipeoutRef.current = line;
        setWipeoutLine(line);
      }
      if (g.status === "over") {
        saveHighScore(g.highScore);
        const target = beatTargetRef.current;
        if (target != null && g.score > target && !victoryFiredRef.current) {
          victoryFiredRef.current = true;
          setBeatVictory(true);
        }
      }
      if (
        g.status === "playing" &&
        beatTargetRef.current != null &&
        g.score > beatTargetRef.current &&
        !victoryFiredRef.current
      ) {
        victoryFiredRef.current = true;
        setBeatVictory(true);
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    runningRef.current = true;
    lastTsRef.current = 0;
    const loop = (ts: number) => {
      if (!runningRef.current) return;
      rafRef.current = requestAnimationFrame(loop);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (!gameRef.current) {
        gameRef.current = createInitialState(
          cssW,
          cssH,
          loadHighScore(),
          laDayKey()
        );
      }
      let state = gameRef.current;
      if (state.width !== cssW || state.height !== cssH) {
        state = { ...state, width: cssW, height: cssH };
        gameRef.current = state;
      }
      ctx.save();
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.translate(cssW, 0);
      ctx.scale(-1, 1);
      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;
      const scale = Math.max(cssW / vw, cssH / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      const ox = (cssW - dw) / 2;
      const oy = (cssH - dh) / 2;
      ctx.drawImage(video, ox, oy, dw, dh);
      ctx.restore();
      const landmarker = landmarkerRef.current;
      let birdY = state.birdY;
      if (landmarker && modelReady) {
        try {
          const result: PoseLandmarkerResult = landmarker.detectForVideo(
            video,
            ts
          );
          const lm = result.landmarks?.[0] as Landmark[] | undefined;
          const sample = trackerRef.current.update(lm ?? null, ts);
          lastPoseSampleRef.current = {
            hasPose: sample.hasPose,
            squatDepth: sample.squatDepth,
            reps: sample.reps,
            calibPhase: sample.calibPhase,
            holdProgress: sample.holdProgress,
            mappedNorm: sample.mappedNorm,
            kneesVisible: sample.kneesVisible,
          };
          if (sample.hasPose) {
            const br = birdRadius(cssH);
            birdY = mapNormToBirdY(sample.mappedNorm, cssH, br);
          }
        } catch {
          /* transient */
        }
      }
      const dt =
        lastTsRef.current === 0
          ? 0
          : Math.min(0.05, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;
      const velHint =
        lastBirdYRef.current === 0
          ? 0
          : (birdY - lastBirdYRef.current) / Math.max(dt, 0.001) / cssH;
      lastBirdYRef.current = birdY;
      const prevStatus = state.status;
      if (state.status === "playing") {
        state = tick(state, dt, birdY);
      } else if (state.status !== "over") {
        state = { ...state, birdY };
      }
      if (prevStatus === "playing" && state.status === "over") {
        const bx = birdX(cssW);
        const br = birdRadius(cssH);
        crashRef.current = createCrashBurst(
          bx,
          state.birdY,
          Math.max(0.7, br / 14)
        );
        const line = pickWipeoutLine(lastWipeoutRef.current);
        lastWipeoutRef.current = line;
        pendingWipeoutRef.current = line;
        track("play_wipeout", {
          score: state.score,
          reps: lastPoseSampleRef.current.reps,
        });
      }
      gameRef.current = state;
      if (crashRef.current) {
        crashRef.current = tickCrash(crashRef.current, dt);
      }
      drawPlayfield(ctx, cssW, cssH);
      drawPipes(ctx, state);
      const crash = crashRef.current;
      const showBird =
        state.status !== "over" || (crash != null && crash.age < 0.07);
      if (showBird) {
        drawBird(ctx, state, state.status === "over" ? 0 : velHint);
      }
      if (crash) {
        drawCrash(ctx, crash);
      }
      drawHud(ctx, state, lastPoseSampleRef.current.reps, beatTargetRef.current);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [modelReady]);

  const beginCalibration = () => {
    trackerRef.current.resetCalibration();
    setCalibPhase("waiting");
    setHoldProgress(0);
    lastPoseSampleRef.current = {
      ...lastPoseSampleRef.current,
      calibPhase: "waiting",
      holdProgress: 0,
      reps: 0,
    };
  };

  const clearCountdownTimer = () => {
    if (countdownTimerRef.current != null) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  const beginPlay = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    if (!trackerRef.current.isCalibrated) return;
    crashRef.current = null;
    pendingWipeoutRef.current = null;
    setWipeoutLine(null);
    setShareStatus(null);
    victoryFiredRef.current = false;
    setBeatVictory(false);
    setCountdown(null);
    const day = laDayKey();
    gameRef.current = startGame({
      ...createInitialState(g.width, g.height, loadHighScore(), day),
      birdY: g.birdY,
    });
    setUi((u) => ({
      ...u,
      status: "playing",
      score: 0,
      reps: 0,
      highScore: loadHighScore(),
    }));
    track("play_start", beatTarget != null ? { beat: beatTarget } : undefined);
  }, [beatTarget]);

  const onStart = () => {
    if (!gameRef.current) return;
    if (countdown != null) return;
    if (!trackerRef.current.isCalibrated) {
      if (!trackerRef.current.lockCurrentAsSquat()) return;
      setCalibPhase("set");
      setHoldProgress(1);
      lastPoseSampleRef.current = {
        ...lastPoseSampleRef.current,
        calibPhase: "set",
        holdProgress: 1,
      };
    }
    clearCountdownTimer();
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown == null) return;
    if (countdown <= 0) {
      clearCountdownTimer();
      beginPlay();
      return;
    }
    clearCountdownTimer();
    countdownTimerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c == null) return null;
        if (c <= 1) return 0;
        return c - 1;
      });
    }, 1000);
    return () => clearCountdownTimer();
  }, [countdown, beginPlay]);

  const onRestart = () => {
    const g = gameRef.current;
    if (!g) return;
    clearCountdownTimer();
    setCountdown(null);
    crashRef.current = null;
    pendingWipeoutRef.current = null;
    beginCalibration();
    setShareStatus(null);
    victoryFiredRef.current = false;
    setBeatVictory(false);
    gameRef.current = {
      ...createInitialState(g.width, g.height, loadHighScore(), laDayKey()),
      birdY: g.birdY,
    };
    setUi((u) => ({
      ...u,
      status: "ready",
      score: 0,
      reps: 0,
      highScore: loadHighScore(),
    }));
  };

  const flashShareStatus = (result: string) => {
    if (result === "copied") setShareStatus("Copied!");
    else if (result === "shared") setShareStatus("Shared!");
    else if (result === "prompted") setShareStatus("Copy the text shown");
    else if (result === "saved") setShareStatus("Card saved");
    else if (result === "opened") setShareStatus("Opening share…");
    else setShareStatus(null);
  };

  const currentSharePayload = () =>
    buildSharePayload({
      mode: beatVictory && beatTarget != null ? "victory" : "challenge",
      score: ui.score,
      reps: ui.reps,
      wipeoutLine,
      beatTarget,
      origin: window.location.origin,
    });

  const currentShareCard = () =>
    renderShareCard({
      score: ui.score,
      reps: ui.reps,
      wipeoutLine,
      beatTarget,
      mode: beatVictory && beatTarget != null ? "victory" : "challenge",
    });

  const onShareWhatsApp = () => {
    const payload = currentSharePayload();
    track("share_click", { channel: "wa" });
    openShareWindow(whatsappShareUrl(payload.text));
    flashShareStatus("opened");
  };

  const onShareX = () => {
    const payload = currentSharePayload();
    track("share_click", { channel: "x" });
    openShareWindow(xIntentUrl({ text: payload.textNoUrl, url: payload.url }));
    flashShareStatus("opened");
  };

  const onCopyLink = async () => {
    const payload = currentSharePayload();
    track("share_click", { channel: "copy" });
    const result = await copyToClipboard(`${payload.text}`);
    flashShareStatus(result);
  };

  const onSaveCard = () => {
    track("share_click", { channel: "card" });
    try {
      const card = currentShareCard();
      downloadShareCard(
        card,
        beatVictory ? "squat-flappy-victory.png" : "squat-flappy-challenge.png"
      );
      flashShareStatus("saved");
    } catch {
      setShareStatus("Couldn’t save card");
    }
  };

  const onShareMore = async () => {
    const payload = currentSharePayload();
    track("share_click", { channel: "native" });
    let file: File | null = null;
    try {
      file = await shareCardFile(currentShareCard());
    } catch {
      file = null;
    }
    const result = await shareOrCopy({
      text: payload.text,
      url: payload.url,
      file,
    });
    flashShareStatus(result);
  };

  const onSharePrimary = async () => {
    const payload = currentSharePayload();
    track("share_click", { channel: "primary" });
    const canNative =
      typeof navigator !== "undefined" && typeof navigator.share === "function";
    if (canNative) {
      let file: File | null = null;
      try {
        file = await shareCardFile(currentShareCard());
      } catch {
        file = null;
      }
      const result = await shareOrCopy({
        text: payload.text,
        url: payload.url,
        file,
      });
      flashShareStatus(result);
      return;
    }
    const mobileish =
      typeof window !== "undefined" &&
      (window.matchMedia("(max-width: 640px)").matches ||
        /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
    if (mobileish) {
      openShareWindow(whatsappShareUrl(payload.text));
      flashShareStatus("opened");
      return;
    }
    const result = await shareOrCopy({
      text: payload.text,
      url: payload.url,
    });
    flashShareStatus(result);
  };

  const loadBoard = useCallback(async () => {
    setBoardLoading(true);
    setBoardError(null);
    try {
      const day = laDayKey();
      setBoardDay(day);
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
      setBoardEntries(data.entries ?? []);
      setBoardStorage(data.storage);
      setBoardDay(data.dayKey);
    } catch (e) {
      setBoardError(e instanceof Error ? e.message : "Failed to load board");
    } finally {
      setBoardLoading(false);
    }
  }, []);

  const onOpenBoard = () => {
    stopCameraStream();
    setCamStatus("idle");
    setBoardOpen(true);
    setSubmitMsg(null);
    void loadBoard();
  };

  const onSubmitScore = async () => {
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      try {
        localStorage.setItem(NICK_KEY, nick);
        localStorage.setItem(EMOJI_KEY, emoji);
      } catch {
        /* ignore */
      }
      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nick,
          emoji,
          score: ui.score,
          reps: ui.reps,
          dayKey: laDayKey(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Submit failed (${res.status})`);
      setBoardEntries(data.entries ?? []);
      setBoardStorage(data.storage);
      track("board_submit", {
        score: ui.score,
        reps: ui.reps,
        storage: data.storage,
      });
      setSubmitMsg(
        data.storage === "memory"
          ? "Posted (memory — set KV_REST_API_URL + KV_REST_API_TOKEN for persistence)"
          : "Posted to today’s board!"
      );
    } catch (e) {
      setBoardError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const startReady = camStatus === "ready" && modelReady && ui.status === "ready";
  const calibSet = calibPhase === "set";
  const canStart = startReady && hasPose;

  const coachMessage = (() => {
    if (!startReady) return null;
    if (!hasPose) {
      return {
        tone: "lime" as const,
        title: CAM_SETUP_HINT,
        detail:
          "Chest-height laptop cam often crops hips — step back if you can. Face or shoulders in frame is enough to Start.",
      };
    }
    if (calibPhase === "waiting" || calibPhase === "holding") {
      return {
        tone: "lime" as const,
        title: "Hold a squat, or tap Start",
        detail:
          holdProgress > 0
            ? `Hold steady… ${Math.round(holdProgress * 100)}%`
            : "Hips preferred. Shoulders work if the desk or laptop cuts them off.",
      };
    }
    return {
      tone: "teal" as const,
      title: "Squat locked — bird up",
      detail: "Stand tall to dive. Sit to rise. Tap Start when ready.",
    };
  })();

  if (boardDeepLink) {
    return <PlaySplash label="Opening daily board…" />;
  }

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden overscroll-none bg-[#06161a] text-white">
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center justify-between gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
        <Link
          href="/"
          className="pointer-events-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/55 px-3 py-2 text-sm backdrop-blur-md hover:bg-black/70"
        >
          ← Home
        </Link>
        <div className="font-display rounded-full bg-teal-950/70 px-3 py-2 text-sm font-bold tracking-tight text-lime-100 backdrop-blur-md">
          Squat Flappy
        </div>
        <button
          type="button"
          onClick={onOpenBoard}
          className="pointer-events-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/55 px-3 py-2 text-sm backdrop-blur-md hover:bg-black/70"
        >
          Board
        </button>
      </header>
      <div ref={containerRef} className="relative min-h-0 flex-1 touch-none">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="pointer-events-none absolute h-px w-px opacity-0"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
        />
        {(camStatus === "requesting" ||
          (camStatus === "ready" && !modelReady)) && (
          <div className="absolute inset-0 z-10">
            <PlaySplash
              label={
                camStatus === "requesting"
                  ? "Requesting camera…"
                  : "Loading pose model…"
              }
            />
          </div>
        )}
        {(camStatus === "denied" || camStatus === "error") && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-6 text-center">
            <div className="max-w-sm space-y-3">
              <p className="text-lg font-semibold">Camera needed</p>
              <p className="text-sm text-teal-100/80">
                {errorMsg || "Enable your camera to play."}
              </p>
              <p className="text-xs text-teal-400">
                Camera requires localhost or HTTPS. A *.vercel.app URL is fine.
              </p>
            </div>
          </div>
        )}
        {showOrientationTip &&
          ui.status === "ready" &&
          camStatus === "ready" && <OrientationTip show />}
        {ui.status === "ready" && (
          <CoachBanner
            coachMessage={coachMessage}
            calibPhase={calibPhase}
            holdProgress={holdProgress}
          />
        )}
        {startReady && countdown == null && (
          <ReadyPanel
            canStart={canStart}
            hasPose={hasPose}
            calibSet={calibSet}
            beatTarget={beatTarget}
            onStart={onStart}
          />
        )}
        {countdown != null && countdown > 0 && (
          <CountdownOverlay count={countdown} />
        )}
        {ui.status === "over" && (
          <GameOverPanel
            score={ui.score}
            highScore={ui.highScore}
            reps={ui.reps}
            wipeoutLine={wipeoutLine}
            beatTarget={beatTarget}
            beatVictory={beatVictory}
            shareStatus={shareStatus}
            onRestart={onRestart}
            onSharePrimary={onSharePrimary}
            onShareWhatsApp={onShareWhatsApp}
            onShareX={onShareX}
            onCopyLink={onCopyLink}
            onSaveCard={onSaveCard}
            onShareMore={onShareMore}
            onOpenBoard={onOpenBoard}
          />
        )}
        <LeaderboardPanel
          open={boardOpen}
          dayKey={boardDay}
          entries={boardEntries}
          storage={boardStorage}
          loading={boardLoading}
          error={boardError}
          nick={nick}
          emoji={emoji}
          score={ui.score}
          reps={ui.reps}
          submitting={submitting}
          submitMsg={submitMsg}
          onNick={setNick}
          onEmoji={setEmoji}
          onClose={() => {
            setBoardOpen(false);
          }}
          onRefresh={() => void loadBoard()}
          onSubmit={() => void onSubmitScore()}
        />
      </div>
    </div>
  );
}
