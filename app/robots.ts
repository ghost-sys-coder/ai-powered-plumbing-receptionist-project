import type { MetadataRoute } from "next";
import { appOrigin } from "@/lib/billing/stripe";

// Crawl the marketing and legal pages; keep the app, sign-in and API out.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/api/", "/sign-in", "/sign-up", "/v2"],
    },
    sitemap: `${appOrigin()}/sitemap.xml`,
  };
}
