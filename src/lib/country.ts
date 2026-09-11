/**
 * Country helpers for the daily board (ISO 3166-1 alpha-2 + flag).
 */

const NAMES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  BR: "Brazil",
  MX: "Mexico",
  JP: "Japan",
  KR: "South Korea",
  DE: "Germany",
  FR: "France",
  ES: "Spain",
  IT: "Italy",
  NL: "Netherlands",
  SE: "Sweden",
  NO: "Norway",
  PL: "Poland",
  PT: "Portugal",
  IE: "Ireland",
  IN: "India",
  PH: "Philippines",
  SG: "Singapore",
  NZ: "New Zealand",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  ZA: "South Africa",
  NG: "Nigeria",
  EG: "Egypt",
  TR: "Turkey",
  UA: "Ukraine",
  CN: "China",
  TW: "Taiwan",
  HK: "Hong Kong",
  TH: "Thailand",
  VN: "Vietnam",
  ID: "Indonesia",
  MY: "Malaysia",
  AE: "UAE",
  IL: "Israel",
  FI: "Finland",
  DK: "Denmark",
  CH: "Switzerland",
  AT: "Austria",
  BE: "Belgium",
  CZ: "Czechia",
  RO: "Romania",
  GR: "Greece",
  XX: "Unknown",
};

export function countryFlag(iso: string): string {
  const code = normalizeCountry(iso);
  if (code === "XX" || code.length !== 2) return "🌍";
  const A = 0x1f1e6;
  const chars = [...code].map((c) =>
    String.fromCodePoint(A + (c.charCodeAt(0) - 65))
  );
  return chars.join("");
}

export function countryName(iso: string): string {
  const code = normalizeCountry(iso);
  return NAMES[code] ?? code;
}

export function normalizeCountry(raw: unknown): string {
  if (typeof raw !== "string") return "XX";
  const c = raw.trim().toUpperCase();
  if (c === "UK") return "GB";
  if (c === "T1" || c === "XX" || c === "ZZ") return "XX";
  if (!/^[A-Z]{2}$/.test(c)) return "XX";
  return c;
}

export function detectCountryFromHeaders(headers: Headers): string {
  const vercel = headers.get("x-vercel-ip-country");
  if (vercel) {
    const n = normalizeCountry(vercel);
    if (n !== "XX") return n;
  }
  const cf =
    headers.get("cf-ipcountry") ||
    headers.get("CF-IPCountry") ||
    headers.get("cloudfront-viewer-country");
  if (cf) {
    const n = normalizeCountry(cf);
    if (n !== "XX") return n;
  }
  const al = headers.get("accept-language");
  if (al) {
    const m = al.match(/^[a-zA-Z]{2,3}[-_]([a-zA-Z]{2})\b/);
    if (m?.[1]) {
      const n = normalizeCountry(m[1]);
      if (n !== "XX") return n;
    }
  }
  return "XX";
}

export function countryLabel(iso: string): string {
  const code = normalizeCountry(iso);
  return `${countryFlag(code)} ${code}`;
}
