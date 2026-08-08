/**
 * Registry-dependent helpers for the Access Group page-permission matrix.
 * Split out of sample-data/access-groups.ts for the same reason
 * renderTemplate.ts is split from documentTemplates.ts: that file is
 * imported by a Client Component (AccessGroupClientTable), and
 * getRegisteredPages()/registerAll.ts pull in node:fs transitively — must
 * only ever be imported from Server Components (the New/Edit access-group
 * pages), never from anything client-bundled.
 */
import { getRegisteredPages } from "./registry";
import "./registerAll";
import type { PagePermission } from "@/lib/sample-data/access-groups";

/** Every vendor-assignable page (excludes Super-Admin-only platform pages) grouped by module, for the permission matrix editor. */
export function getAssignablePagesByModule(): { moduleSlug: string; pages: { id: string; title: string }[] }[] {
  const pages = getRegisteredPages().filter((p) => !p.superAdminOnly);
  const byModule = new Map<string, { id: string; title: string }[]>();
  for (const p of pages) {
    const list = byModule.get(p.moduleSlug) ?? [];
    list.push({ id: p.id, title: p.title });
    byModule.set(p.moduleSlug, list);
  }
  return Array.from(byModule.entries()).map(([moduleSlug, modPages]) => ({ moduleSlug, pages: modPages }));
}

/** Default permission set for a bundle of module slugs — every page in those modules gets full access. */
export function defaultPermissionsForModules(moduleSlugs: string[]): PagePermission[] {
  const pages = getRegisteredPages().filter((p) => !p.superAdminOnly && moduleSlugs.includes(p.moduleSlug));
  return pages.map((p) => ({ pageId: p.id, view: true, edit: true, delete: true, other: true }));
}
