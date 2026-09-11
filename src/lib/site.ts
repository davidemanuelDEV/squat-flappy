/**
 * Public site origin for share links, OG, robots, sitemap.
 * Canonical product host is squatflappy.com.
 * Never hardcode pushflappy.com — this is a sibling app.
 */

export const CANONICAL_ORIGIN = "https://squatflappy.com";

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
export const APP_TAGLINE =
  "Eye-height webcam air-squat game. Cam at eye height · start in a squat.";
