# Squat Flappy

**Your standing desk is now an arcade.**

Stand. Squat. Dodge. Chest-height webcam air-squat game.

Sibling of [Push Flappy](https://pushflappy.com) — its own branded app, pose mapping, and daily board. Not a mode inside Push Flappy. Wipeout / challenge share surfaces light-link “Legs smoked? Push day → pushflappy.com” to `https://pushflappy.com/play` (`SIBLING_PLAY_URL` in `src/lib/site.ts`).

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

Canonical origin is **https://squatflappy.com** (share, OG, sitemap, beat-me). Preview deployments (`VERCEL_ENV=preview`) may emit the preview `*.vercel.app` host so branch unfurls stay fetchable. Override with `NEXT_PUBLIC_SITE_ORIGIN` if you need a different public host. Never use pushflappy.com.

Optional durable daily board (same Vercel KV / Upstash pair as other apps is OK — keys are prefixed `squat-flappy:`):

| Env var | Purpose |
|---------|---------|
| `NEXT_PUBLIC_SITE_ORIGIN` | Public origin for share / OG / sitemap / beat-me. Defaults to `https://squatflappy.com`. |
| `KV_REST_API_URL` | Upstash / Vercel KV REST URL |
| `KV_REST_API_TOKEN` | REST token |
| `UPSTASH_REDIS_REST_URL` | Alias for `KV_REST_API_URL` (same REST protocol) |
| `UPSTASH_REDIS_REST_TOKEN` | Alias for `KV_REST_API_TOKEN` |

Without KV the board still works in memory (lost on cold starts). Either env pair is enough — `KV_*` wins if both are set. Keys stay prefixed `squat-flappy:` so this board never mixes with Push.

## Pose (the difference)

Do **not** use torso-Y push-up mapping.

1. Hold a ~90° air squat (thighs parallel) for ~1s — that locks bird **up**.
2. Standing tall = dive (bird down).
3. Prefer **hip height** (MediaPipe Y grows downward) blended with **knee angle** (hip–knee–ankle) when knees are visible.
4. If a chest-height laptop crops the hips, fall back to **shoulder Y** (then nose) so a person in frame can Start.
5. If the desk hides the knees, skip the angle blend.
6. EMA smoothing. Reps are **squats**, not push-ups.

Recommend chest-height framing and stepping back so hips stay visible when possible. Shoulders are enough to play. If a low camera makes stand sit *lower* in the frame than squat, polarity inverts automatically.

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
