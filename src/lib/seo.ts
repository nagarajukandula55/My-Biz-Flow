/**
 * Single source of truth for the canonical production domain, read by
 * layout.tsx (metadataBase/OG), robots.ts, sitemap.ts, and any page-level
 * JSON-LD that needs an absolute `url`.
 *
 * Defaults to the real production domain (mybizflow.in); override via
 * NEXT_PUBLIC_SITE_URL for preview/staging deployments.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mybizflow.in";

export const SITE_NAME = "My Biz Flow";
