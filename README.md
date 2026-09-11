# Squat Flappy

**Your standing desk is now an arcade.**

Stand. Squat. Dodge. Eye-height webcam air-squat game.

Sibling of [Push Flappy](https://pushflappy.com) — its own branded app, pose mapping, and daily board. Not a mode inside Push Flappy.

## Play

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Start playing**.

Production build:

```bash
npm run build && npm start
```

## Deploy (Hobby / $0)

```bash
npm i -g vercel
vercel login
vercel link
vercel --prod
```

A `*.vercel.app` URL is fine — no paid domain. After the first production deploy, set `NEXT_PUBLIC_SITE_ORIGIN` to that URL (or your custom host) so beat-me links and OG never point at pushflappy.com.

Optional durable daily board (same Vercel KV / Upstash pair as other apps is OK — keys are prefixed `squat-flappy:`):

| Env var | Purpose |
|---------|---------|
| `NEXT_PUBLIC_SITE_ORIGIN` | Public origin for share / OG / sitemap |
| `KV_REST_API_URL` | Upstash / Vercel KV REST URL |
| `KV_REST_API_TOKEN` | REST token |

Without KV the board still works in memory (lost on cold starts).

## Pose (the difference)

Do **not** use torso-Y push-up mapping.

1. Hold a ~90° air squat (thighs parallel) for ~1s — that locks bird **up**.
2. Standing tall = dive (bird down).
3. Prefer **hip height** (MediaPipe Y grows downward) blended with **knee angle** (hip–knee–ankle) when knees are visible.
4. If the desk hides the knees, hip-only fallback.
5. EMA smoothing. Reps are **squats**, not push-ups.

Desk hypothesis: hip Y is more reliable at eye height. If a low camera makes stand sit *lower* in the frame than squat, hip polarity inverts automatically.

## Stack

- Next.js 15 · React 19 · TypeScript · Tailwind CSS v4
- `@mediapipe/tasks-vision` (on-device, no API keys)
- `@vercel/analytics`
- Optional Vercel KV / Upstash for the daily board
- No accounts, no VectorCare branding, original geometric art

## Routes

| Path | Description |
|------|-------------|
| `/` | Landing |
| `/play` | Camera game (`?beat=N` challenge) |
| `/board` | Camera-free daily board |
| `/faq` | FAQ |
| `/api/leaderboard` | Daily board GET/POST |
| `/api/og` | Dynamic OG image |
