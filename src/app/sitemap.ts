import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteOrigin();
  const lastModified = new Date();
  return [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/play`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/board`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/faq`, lastModified, changeFrequency: "monthly", priority: 0.7 },
  ];
}
