import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * /robots.txt -- Next.js App Router auto-generates this from the default
 * export below. Every authenticated/tenant-scoped surface (partner
 * workspaces, admin/designer tooling, API routes, auth flows) is
 * disallowed -- there's nothing there for a search engine to usefully
 * index, and crawling it wastes crawl budget that should go to the real
 * public marketing pages instead. Pattern matches AN-CRM's robots.ts
 * (src/app/robots.ts there), the sibling product's existing SEO baseline.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/partner",
        "/admin",
        "/api",
        "/login",
        "/signup",
        "/forgot-password",
        "/change-password",
        "/subscribe",
        "/design-system",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
