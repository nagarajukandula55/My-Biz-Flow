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

/** Lives here (not src/lib/email.ts) so lib modules that need it — like
 * emailTemplatesData.ts's commonEmailTokens() — don't create a circular
 * import with email.ts, which itself imports FROM emailTemplatesData.ts. */
export const SUPPORT_EMAIL = "support@mybizflow.in";
