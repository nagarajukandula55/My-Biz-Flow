/**
 * Single source of truth for the canonical production domain, read by
 * layout.tsx (metadataBase/OG), robots.ts, sitemap.ts, and any page-level
 * JSON-LD that needs an absolute `url`.
 *
 * NOT yet assigned anywhere else in this codebase (no NEXT_PUBLIC_SITE_URL
 * in .env.example, no domain string in src/lib/env.ts) -- this placeholder
 * keeps every URL-emitting surface absolute instead of silently broken, but
 * it MUST be replaced with the real production domain (via
 * NEXT_PUBLIC_SITE_URL) before launch, or canonical URLs / sitemap entries /
 * structured data will point at a domain nobody owns.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mybizflow.example.com";

export const SITE_NAME = "My Biz Flow";
