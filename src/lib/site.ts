/**
 * Public site origin for share links, OG, robots, sitemap.
 * Never hardcode pushflappy.com — this is a sibling app.
 */

const FALLBACK_LOCAL = "http://localhost:3000";

function stripSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function asHttpsHost(host: string): string {
  const trimmed = host.trim().replace(/^https?:\/\//, "");
  return `https://${stripSlash(trimmed)}`;
}

/**
 * Resolve the public origin.
 * Priority: NEXT_PUBLIC_SITE_ORIGIN → Vercel production URL → Vercel URL → localhost.
 */
export function siteOrigin(
  env: NodeJS.ProcessEnv = process.env
): string {
  const explicit = env.NEXT_PUBLIC_SITE_ORIGIN?.trim();
  if (explicit) return stripSlash(explicit);

  if (typeof window !== "undefined" && window.location?.origin) {
    const live = stripSlash(window.location.origin);
    if (live && !live.includes("pushflappy.com")) return live;
  }

  const production = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) return asHttpsHost(production);

  const vercelUrl =
    env.NEXT_PUBLIC_VERCEL_URL?.trim() || env.VERCEL_URL?.trim();
  if (vercelUrl) return asHttpsHost(vercelUrl);

  return FALLBACK_LOCAL;
}

export const APP_NAME = "Squat Flappy";
export const APP_HOOK = "Your standing desk is now an arcade.";
export const APP_LINE = "Stand. Squat. Dodge.";
export const APP_TAGLINE =
  "Eye-height webcam air-squat game. Cam at eye height · start in a squat.";
