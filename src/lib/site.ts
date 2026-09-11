/**
 * Public site origin for share links, OG, robots, sitemap.
 * Canonical product host is squatflappy.com (DNS may be attached later).
 * Never hardcode pushflappy.com — this is a sibling app.
 */

export const CANONICAL_ORIGIN = "https://squatflappy.com";

function stripSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Resolve the public origin.
 * NEXT_PUBLIC_SITE_ORIGIN overrides; otherwise squatflappy.com.
 * *.vercel.app is fine to serve the app until DNS is attached.
 */
export function siteOrigin(
  env: NodeJS.ProcessEnv = process.env
): string {
  const explicit = env.NEXT_PUBLIC_SITE_ORIGIN?.trim();
  if (explicit) return stripSlash(explicit);
  return CANONICAL_ORIGIN;
}

export const APP_NAME = "Squat Flappy";
export const APP_HOOK = "Your standing desk is now an arcade.";
export const APP_LINE = "Stand. Squat. Dodge.";
export const APP_TAGLINE =
  "Eye-height webcam air-squat game. Cam at eye height · start in a squat.";
