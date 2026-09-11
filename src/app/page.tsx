import type { ReactNode } from "react";
import Link from "next/link";
import { GeometricBird, SteelBar } from "@/components/BrandMark";
import {
  APP_HOOK,
  APP_LINE,
  APP_NAME,
  CAM_SETUP_HINT,
  SIBLING_NAME,
  SIBLING_ORIGIN,
  siteOrigin,
} from "@/lib/site";

export default function HomePage() {
  const origin = siteOrigin();

  return (
    <main className="relative mx-auto flex min-h-[100dvh] max-w-lg flex-col px-5 pt-[max(1.75rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: APP_NAME,
              url: origin,
              applicationCategory: "GameApplication",
              operatingSystem: "Web",
              description: `${APP_HOOK} ${APP_LINE} Air squat game and desk exercise game using a chest-height webcam.`,
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            },
            {
              "@context": "https://schema.org",
              "@type": "HowTo",
              name: "How to play Squat Flappy",
              description:
                "Play a flappy-style camera squat challenge at your standing desk.",
              step: [
                {
                  "@type": "HowToStep",
                  name: "Cam at chest height",
                  text: "Put the laptop on the desk, webcam at chest height facing you. Step back so hips are in frame if you can; shoulders work too.",
                },
                {
                  "@type": "HowToStep",
                  name: "Start in a squat",
                  text: "Hold a ~90° air squat, then tap Start to lock bird up.",
                },
                {
                  "@type": "HowToStep",
                  name: "Stand. Squat. Dodge.",
                  text: "Stand tall to dive through steel gates. Sit to rise. Clear gaps to score.",
                },
              ],
            },
          ]),
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-lime-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-24 right-0 h-56 w-56 rounded-full bg-teal-600/20 blur-3xl"
      />

      <div className="relative flex flex-1 flex-col gap-8 sm:gap-10">
        <header className="space-y-4 pt-2 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-lime-300/95">
            Standing desk · Arcade
          </p>
          <h1 className="font-display text-[3.15rem] font-bold leading-[0.95] tracking-tight text-lime-50 sm:text-6xl">
            {APP_NAME}
          </h1>
          <p className="mx-auto max-w-sm text-lg font-semibold leading-snug text-lime-100/90 sm:text-xl">
            {APP_HOOK}
          </p>
          <p className="font-display text-xl font-bold tracking-tight text-teal-200">
            {APP_LINE}
          </p>
          <p className="mx-auto max-w-md text-[15px] leading-relaxed text-teal-200/70">
            Chest-height webcam air-squat game. Hold parallel to lock bird up —
            stand tall to dive through steel gates. On-device pose. No accounts.
          </p>
        </header>

        <div className="relative overflow-hidden rounded-3xl border border-teal-700/40 bg-gradient-to-b from-[#06161a]/90 via-[#0b2e2c]/85 to-[#052e16] px-5 py-8 shadow-[0_0_0_1px_rgba(45,212,191,0.16),0_20px_50px_-20px_rgba(0,0,0,0.6)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime-300/50 to-transparent"
          />
          <div className="relative flex items-center justify-center gap-8 sm:gap-10">
            <div className="sf-float">
              <GeometricBird />
            </div>
            <div className="sf-pipes relative flex flex-col gap-3 opacity-95">
              <SteelBar h={52} />
              <div className="h-11" />
              <SteelBar h={64} />
            </div>
          </div>
          <p className="relative mt-5 text-center text-[11px] font-semibold uppercase tracking-wider text-teal-200/50">
            Hip + knee pose · MediaPipe · local high score
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/play"
            className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-lime-400 px-6 py-4 text-lg font-bold text-lime-950 shadow-lg shadow-lime-400/25 transition hover:bg-lime-300 active:scale-[0.98]"
          >
            Start playing
          </Link>
          <div className="grid grid-cols-3 gap-2.5">
            <Link
              href="/board"
              className="flex min-h-12 items-center justify-center rounded-2xl border border-teal-800/60 bg-teal-950/70 px-2 py-3 text-sm font-semibold text-lime-50 transition hover:border-lime-500/40 hover:bg-teal-900"
            >
              Daily board
            </Link>
            <Link
              href="/faq"
              className="flex min-h-12 items-center justify-center rounded-2xl border border-teal-800/60 bg-teal-950/70 px-2 py-3 text-sm font-semibold text-lime-50 transition hover:border-lime-500/40 hover:bg-teal-900"
            >
              FAQ
            </Link>
            <a
              href="#challenge"
              className="flex min-h-12 items-center justify-center rounded-2xl border border-teal-800/60 bg-teal-950/70 px-2 py-3 text-sm font-semibold text-lime-50 transition hover:border-lime-500/40 hover:bg-teal-900"
            >
              Challenge
            </a>
          </div>
          <p className="text-center text-xs text-teal-500">
            {CAM_SETUP_HINT} · HTTPS or localhost
          </p>
        </div>

        <section className="space-y-4" aria-labelledby="how-heading">
          <h2
            id="how-heading"
            className="text-center text-xs font-bold uppercase tracking-[0.2em] text-lime-400/80"
          >
            How it works
          </h2>
          <ol className="grid gap-3">
            <Step n={1} title="Cam at chest height">
              Laptop on the standing desk, webcam at chest height facing you.
              Step back so hips are in frame if you can — shoulders work too.
            </Step>
            <Step n={2} title="Start in a squat">
              Hold a ~90° air squat (thighs parallel), then tap Start. That
              locks bird “up”.
            </Step>
            <Step n={3} title="Stand. Squat. Dodge.">
              Stand tall to dive through steel gates. Sit to rise. Clear gaps
              to score. Same daily seed for everyone (Pacific).
            </Step>
          </ol>
        </section>

        <section className="grid gap-3" aria-labelledby="social-heading">
          <h2 id="social-heading" className="sr-only">
            Challenges and daily board
          </h2>
          <div className="rounded-2xl border border-teal-700/40 bg-teal-950/45 px-4 py-4">
            <p className="text-sm font-bold text-lime-300">Daily board</p>
            <p className="mt-1.5 text-sm leading-relaxed text-teal-100/70">
              Everyone gets the{" "}
              <strong className="font-semibold text-lime-50">
                same gate seed each day
              </strong>{" "}
              (Pacific time). Post an anonymous nick + emoji and climb today’s
              squat board.
            </p>
          </div>
          <div
            id="challenge"
            className="scroll-mt-24 rounded-2xl border border-teal-800/50 bg-teal-950/65 px-4 py-4"
          >
            <p className="text-sm font-bold text-lime-50">Beat-me challenges</p>
            <p className="mt-1.5 text-sm leading-relaxed text-teal-200/70">
              Wipe out, then share via{" "}
              <strong className="font-semibold text-teal-50">
                WhatsApp, X, copy, or a share card
              </strong>
              . Friends open{" "}
              <code className="text-lime-200">/play?beat=N</code> — bar-to-beat
              in the HUD, victory flex when they clear it.
            </p>
          </div>
        </section>

        <footer className="mt-auto space-y-3 pb-2 pt-4 text-center">
          <Link
            href="/play"
            className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-lime-400/40 bg-lime-400/10 px-6 py-3 text-base font-bold text-lime-200 transition hover:bg-lime-400/20 active:scale-[0.98]"
          >
            Start
          </Link>
          <p className="text-[11px] text-teal-500">
            <Link href="/faq" className="underline-offset-2 hover:underline">
              FAQ
            </Link>
            {" · "}
            <Link href="/board" className="underline-offset-2 hover:underline">
              Daily board
            </Link>
            {" · "}
            <Link href="/play" className="underline-offset-2 hover:underline">
              Play
            </Link>
          </p>
          <p className="text-sm text-teal-200">
            <a
              href={SIBLING_ORIGIN}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline"
            >
              Also play {SIBLING_NAME}
            </a>
          </p>
          <p className="text-[11px] text-teal-700">
            squatflappy.com · no accounts · pose stays on your device
          </p>
        </footer>
      </div>
    </main>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3.5 rounded-2xl border border-teal-900/70 bg-teal-950/55 px-4 py-3.5">
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-400/20 text-sm font-bold text-lime-300"
      >
        {n}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-[15px] font-semibold text-lime-50">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-teal-200/70">{children}</p>
      </div>
    </li>
  );
}
