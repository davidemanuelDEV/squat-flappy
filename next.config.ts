import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/manifest.webmanifest",
      headers: [
        { key: "Content-Type", value: "application/manifest+json" },
      ],
    },
  ],
  // Leftover crawler / share caches that still request the static bird card.
  rewrites: async () => [{ source: "/og.png", destination: "/api/og" }],
};

export default nextConfig;
