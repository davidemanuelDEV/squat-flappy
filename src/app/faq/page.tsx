import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { GeometricBird } from "@/components/BrandMark";
import { APP_LINE, APP_NAME, siteOrigin } from "@/lib/site";

const site = siteOrigin();

export const metadata: Metadata = {
  title: `FAQ — ${APP_NAME}`,
  description:
    "How Squat Flappy works: air squats drive the bird, desk camera setup, beat-me links, daily board, and on-device privacy.",
  openGraph: {
    title: `FAQ — ${APP_NAME}`,
    description:
      "How Squat Flappy works: air squats drive the bird, desk camera setup, beat-me links, daily board, and on-device privacy.",
    url: `${site}/faq`,
    type: "website",
    siteName: APP_NAME,
    images: [{ url: "/api/og", width: 1200, height: 630, alt: `${APP_NAME} FAQ` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `FAQ — ${APP_NAME}`,
    description:
      "How Squat Flappy works: air squats drive the bird, desk camera setup, beat-me links, daily board, and on-device privacy.",
    images: ["/api/og"],
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "How does Squat Flappy work?",
    a: "Your body is the controller. An eye-height webcam and on-device pose tracking map a ~90° air squat to bird up and standing tall to a dive. Sit to rise, stand to drop through steel gates. Clear gaps to score — no taps once you are calibrated.",
  },
  {
    q: "What camera setup do I need?",
    a: "Laptop on a standing desk, webcam at eye height, facing you. Allow camera permission, start in a squat, and hold parallel for about a second to lock “up.” Knees can hide behind the desk — hips are enough. HTTPS or localhost is required.",
  },
  {
    q: "Is this a mode inside Push Flappy?",
    a: "No. Squat Flappy is its own branded app and daily board. Push Flappy stays a push-up game. The two boards never share KV keys.",
  },
  {
    q: "What are beat-me links?",
    a: "After a run you can share a challenge via WhatsApp, X, copy, or a share card. Friends open a link like /play?beat=N (optional &reps=) and see your score as the bar to beat. If they clear it, they get a victory flex and can share back.",
  },
  {
    q: "What is the daily board?",
    a: "Everyone plays the same gate seed each day (Pacific time), so scores are comparable. Post an anonymous nick + emoji from the game — no account. Browse today’s board any time at /board without turning the camera on.",
  },
  {
    q: "Is my camera / pose data private?",
    a: "Pose runs on your device with MediaPipe. Video frames stay local for tracking; we do not upload your camera feed for pose. Scores you choose to post are anonymous nick + emoji + score (and a coarse country from the connection).",
  },
  {
    q: "Do I need an account or a paid domain?",
    a: "No. There are no logins and no paid domain. A *.vercel.app URL is fine. Local high score stays on your device. Daily board posts are optional and anonymous.",
  },
  {
    q: "Why won’t the camera start?",
    a: "Browsers require a secure context (HTTPS) and an explicit permission grant. Deny the permission, use HTTP on a random IP, or cover the lens and pose won’t lock. Reload, allow camera, and hold a stable squat for calibration.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
};

export default function FaqPage() {
  return (
    <main className="relative mx-auto flex min-h-[100dvh] max-w-lg flex-col px-5 pt-[max(1.75rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-lime-400/15 blur-3xl"
      />

      <div className="relative flex flex-1 flex-col gap-8">
        <header className="space-y-3 pt-2 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-lime-300/95">
            Help · Desk arcade
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-lime-50 sm:text-5xl">
            FAQ
          </h1>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-teal-200/70">
            {APP_LINE} Camera on device. Challenges and a daily board — no
            accounts.
          </p>
          <div className="flex justify-center pt-1">
            <GeometricBird width={64} height={52} />
          </div>
        </header>

        <nav
          aria-label="Site"
          className="flex flex-wrap items-center justify-center gap-2 text-sm"
        >
          <NavChip href="/">Home</NavChip>
          <NavChip href="/play">Play</NavChip>
          <NavChip href="/board">Daily board</NavChip>
        </nav>

        <section className="space-y-3" aria-label="Frequently asked questions">
          {FAQS.map((item) => (
            <article
              key={item.q}
              className="rounded-2xl border border-teal-900/70 bg-teal-950/55 px-4 py-4"
            >
              <h2 className="text-[15px] font-semibold text-lime-50">
                {item.q}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-teal-200/70">
                {item.a}
              </p>
            </article>
          ))}
        </section>

        <footer className="mt-auto space-y-3 pb-2 pt-2 text-center">
          <Link
            href="/play"
            className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-lime-400 px-6 py-3 text-base font-bold text-lime-950 shadow-lg shadow-lime-400/20 transition hover:bg-lime-300 active:scale-[0.98]"
          >
            Start playing
          </Link>
          <p className="text-[11px] text-teal-700">
            <Link href="/" className="underline-offset-2 hover:underline">
              Home
            </Link>
            {" · "}
            <Link href="/board" className="underline-offset-2 hover:underline">
              Daily board
            </Link>
            {" · "}
            {APP_NAME}
          </p>
        </footer>
      </div>
    </main>
  );
}

function NavChip({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center justify-center rounded-full border border-teal-800/60 bg-teal-950/70 px-3.5 text-xs font-semibold text-lime-50 transition hover:border-lime-500/40"
    >
      {children}
    </Link>
  );
}
