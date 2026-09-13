import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * /sitemap.xml -- Next.js App Router auto-generates this from the default
 * export below. Lists only the real, public, indexable marketing pages;
 * every authenticated/tenant-scoped route (/partner, /admin, /api, /login,
 * /signup) is deliberately excluded, same boundary robots.ts draws. Mirrors
 * AN-CRM's sitemap.ts shape (src/app/sitemap.ts there).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const pages: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
    { path: "/help", priority: 0.6, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  ];

  return pages.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
