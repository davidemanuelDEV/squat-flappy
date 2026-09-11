/**
 * Public site origin for share links, OG, robots, sitemap.
 * Canonical product host is squatflappy.com.
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
 * Host for metadataBase, OG/twitter images, and in-app share/beat-me URLs.
 * NEXT_PUBLIC_SITE_ORIGIN overrides everything.
 * Preview deployments keep the preview host so branch unfurls stay fetchable.
 * Production (and anything without a preview URL) uses squatflappy.com —
 * VERCEL_PROJECT_PRODUCTION_URL stays squat-flappy.vercel.app even after
 * the custom domain is attached.
 */
export function servingOrigin(
  env: NodeJS.ProcessEnv = process.env
): string {
  const explicit = env.NEXT_PUBLIC_SITE_ORIGIN?.trim();
  if (explicit) return stripSlash(explicit);
  if (env.VERCEL_ENV === "preview") {
    const vercel = env.VERCEL_URL?.trim();
    if (vercel) return withHttps(vercel);
  }
  return CANONICAL_ORIGIN;
}

export const APP_NAME = "Squat Flappy";
export const APP_HOOK = "Your standing desk is now an arcade.";
export const APP_LINE = "Stand. Squat. Dodge.";
export const CAM_SETUP_HINT = "Cam at chest height · start in a squat";
export const APP_TAGLINE =
  "Chest-height webcam air-squat game. Cam at chest height · start in a squat.";
