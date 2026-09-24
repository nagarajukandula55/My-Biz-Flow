/**
 * Single source of truth for the canonical production domain, read by
 * layout.tsx (metadataBase/OG), robots.ts, sitemap.ts, and any page-level
 * JSON-LD that needs an absolute `url`.
 *
 * Defaults to the real production domain. Confirmed via a live Google OAuth
 * redirect_uri_mismatch error this session that the site actually serves
 * from www.mybizflow.in, not bare mybizflow.in — canonical tags, sitemap
 * URLs, and OG/JSON-LD urls all need to match that exactly, or Search
 * Console can flag them as "Alternate page with proper canonical tag"
 * (i.e. Google treats them as duplicates of a different canonical domain).
 * Override via NEXT_PUBLIC_SITE_URL for preview/staging deployments — but
 * confirm the Vercel production env var is actually set to the www form,
 * since this default is only a local-dev fallback.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.mybizflow.in";

export const SITE_NAME = "My Biz Flow";

/** Lives here (not src/lib/email.ts) so lib modules that need it — like
 * emailTemplatesData.ts's commonEmailTokens() — don't create a circular
 * import with email.ts, which itself imports FROM emailTemplatesData.ts. */
export const SUPPORT_EMAIL = "support@mybizflow.in";
