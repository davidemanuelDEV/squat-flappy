/**
 * Public site origin for share links, OG, robots, sitemap.
 * Canonical product host is squatflappy.com (DNS may be attached later).
 * Never use pushflappy.com as this app's origin — that host is the sibling.
 */

export const CANONICAL_ORIGIN = "https://squatflappy.com";

/**
 * Sibling arcade (Push Flappy). Easy to retarget later.
 * Do not reuse these for sitemap / robots / OG / beat-me links.
 */
export const SIBLING_NAME = "Push Flappy";
export const SIBLING_ORIGIN = "https://pushflappy.com";
export const SIBLING_PLAY_URL = `${SIBLING_ORIGIN}/play`;
/** Locked growth copy — secondary only, never a primary share button. */
export const SIBLING_PROMO_LINE = "Legs smoked? Push day → pushflappy.com";

function stripSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function withHttps(host: string): string {
  const t = host.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return stripSlash(t);
  return `https://${stripSlash(t)}`;
}

/**
 * Canonical product origin for sitemap, robots, JSON-LD.
 * NEXT_PUBLIC_SITE_ORIGIN overrides; otherwise squatflappy.com.
 */
export function siteOrigin(
  env: NodeJS.ProcessEnv = process.env
): string {
  const explicit = env.NEXT_PUBLIC_SITE_ORIGIN?.trim();
  if (explicit) return stripSlash(explicit);
  return CANONICAL_ORIGIN;
}

/**
 * Host crawlers can actually fetch (OG images, metadataBase, share URLs).
 * Prefer the live Vercel production alias, then the deployment URL.
 * After squatflappy.com is attached as production, that host wins.
 */
export function servingOrigin(
  env: NodeJS.ProcessEnv = process.env
): string {
  const explicit = env.NEXT_PUBLIC_SITE_ORIGIN?.trim();
  if (explicit) return stripSlash(explicit);
  const prod = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (prod) return withHttps(prod);
  const vercel = env.VERCEL_URL?.trim();
  if (vercel) return withHttps(vercel);
  return CANONICAL_ORIGIN;
}

export const APP_NAME = "Squat Flappy";
export const APP_HOOK = "Your standing desk is now an arcade.";
export const APP_LINE = "Stand. Squat. Dodge.";
export const APP_TAGLINE =
  "Eye-height webcam air-squat game. Cam at eye height · start in a squat.";
