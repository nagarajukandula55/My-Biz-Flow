import type { PageDefinition } from "./registry";

/**
 * Matches a real request pathname (e.g. "/vendor/v1/pos/admin") against a
 * registered page's template path (e.g. "/vendor/[vendorId]/pos/admin"),
 * treating [bracket] segments as wildcards. Used by the /api/page-access
 * route to resolve "which registered page is this actual URL" — needed
 * because middleware runs on the Edge runtime and can't import the full
 * page registry itself (every page.tsx has Node-only imports), so the
 * lookup happens in a Node.js API route instead; see src/middleware.ts.
 */
export function pathMatchesTemplate(pathname: string, template: string): boolean {
  const pathSegs = pathname.split("/").filter(Boolean);
  const templateSegs = template.split("/").filter(Boolean);
  if (pathSegs.length !== templateSegs.length) return false;
  return templateSegs.every((seg, i) => seg.startsWith("[") || seg === pathSegs[i]);
}

export function findPageByPathname(
  pages: PageDefinition[],
  pathname: string
): PageDefinition | undefined {
  return pages.find((p) => pathMatchesTemplate(pathname, p.path));
}
