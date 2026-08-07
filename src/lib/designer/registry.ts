/**
 * The Designer registry — every page in the app must register itself here.
 * This is what makes "customizable, nothing missed" enforceable rather than
 * aspirational: a Super Admin's /admin/designer view is generated FROM this
 * registry, so a page that never registers is a page that can never be
 * found or customized. See DESIGN_SYSTEM.md §8 for the binding rule.
 *
 * This is a build-time/module-load-time registry (a plain in-memory map),
 * not a database table — every server-rendered request re-imports the
 * module tree, which re-runs each registerPage() call, so the registry is
 * always in sync with the actual route tree. When real persistence for
 * per-page customization overrides is added later, it will read this
 * registry as its schema, not replace it.
 */

export type PageKind = "list" | "detail" | "kanban" | "admin" | "dashboard" | "form" | "other";

export interface CustomizableRegion {
  /** Stable key a Super Admin's customization override attaches to */
  key: string;
  /** What this region controls, in plain language */
  label: string;
}

export interface PageDefinition {
  /** Globally unique id, convention: "<moduleSlug>.<kind>" e.g. "pos.list" */
  id: string;
  /** Module slug this page belongs to — must exist in MODULES (src/lib/designer/modules.ts) */
  moduleSlug: string;
  /** Human-facing title shown in the Designer list */
  title: string;
  /** App Router path, with dynamic segments left literal, e.g. "/vendor/[vendorId]/pos" */
  path: string;
  kind: PageKind;
  /** True if this page is gated to Super Admin only (lives in a module's admin/ subfolder) */
  superAdminOnly: boolean;
  /** What a Super Admin can customize on this page via the Designer */
  customizableRegions: CustomizableRegion[];
  /** Plain-language paragraph explaining what this page does and why it exists */
  explanation: string;
  /** File path relative to repo root, e.g. "src/app/vendor/[vendorId]/pos/page.tsx" */
  sourceFile: string;
}

const registry = new Map<string, PageDefinition>();

/**
 * Call this once at module scope (not inside the component function) in
 * every page.tsx / route file that should be visible to the Designer —
 * which, per DESIGN_SYSTEM.md §8, is every page without exception.
 */
export function registerPage(def: PageDefinition): PageDefinition {
  if (registry.has(def.id)) {
    // Re-registration under the same id (hot reload, repeated import) is
    // expected and just overwrites — duplicate ids for DIFFERENT pages are
    // the actual bug we want to catch.
    const existing = registry.get(def.id)!;
    if (existing.path !== def.path) {
      throw new Error(
        `Designer registry collision: id "${def.id}" is already registered for path "${existing.path}", cannot re-register for "${def.path}". Page ids must be unique — use "<moduleSlug>.<kind>.<qualifier>" if a module has more than one page of the same kind.`
      );
    }
  }
  registry.set(def.id, def);
  return def;
}

export function getRegisteredPages(): PageDefinition[] {
  return Array.from(registry.values()).sort((a, b) => a.id.localeCompare(b.id));
}

export function getPagesForModule(moduleSlug: string): PageDefinition[] {
  return getRegisteredPages().filter((p) => p.moduleSlug === moduleSlug);
}

export function getPage(pageId: string): PageDefinition | undefined {
  return registry.get(pageId);
}
