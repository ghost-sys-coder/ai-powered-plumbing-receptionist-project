import type { MetadataRoute } from "next";
import { appOrigin } from "@/lib/app-origin";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = appOrigin();
  return [
    { url: `${origin}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/data-deletion`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
