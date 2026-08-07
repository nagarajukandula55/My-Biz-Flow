import Link from "next/link";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { StatusChip } from "@/components/StatusChip";
import { LogoMark } from "@/components/LogoMark";
import { MODULES, taxonomyDotClass } from "@/lib/designer/modules";
import { getPagesForModule, getRegisteredPages, registerPage } from "@/lib/designer/registry";
import "@/lib/designer/registerAll";

registerPage({
  id: "platform.designer.list",
  moduleSlug: "platform",
  title: "Designer — Page Registry",
  path: "/admin/designer",
  kind: "admin",
  superAdminOnly: true,
  customizableRegions: [],
  explanation:
    "Super-Admin-only view of every page registered in the product, grouped by module (plus a Platform section for non-vendor pages like this one and Help). It exists so nothing built in the app can go undiscoverable or uncustomizable — a page that never calls registerPage() is a bug, not an edge case.",
  sourceFile: "src/app/admin/designer/page.tsx",
});

/**
 * Platform-level Super Admin tool — NOT vendor-scoped, so it deliberately
 * does not use the vendor AppShell (that shell assumes a single vendor's
 * module nav; this page spans every vendor's every module). This is the
 * live implementation of the binding rule in DESIGN_SYSTEM.md §8: every
 * page in the app must register in the Designer, and this page is where
 * that registration becomes visible and (eventually) editable.
 */
export default function DesignerPage() {
  const pagesByModule = MODULES.map((mod) => ({
    mod,
    pages: getPagesForModule(mod.slug),
  }));

  const moduleSlugs = new Set(MODULES.map((m) => m.slug));
  const platformPages = getRegisteredPages().filter((p) => !moduleSlugs.has(p.moduleSlug));

  const totalPages =
    pagesByModule.reduce((sum, m) => sum + m.pages.length, 0) + platformPages.length;

  return (
    <SuperAdminGate>
      <div className="min-h-screen w-full bg-bg">
        <header className="border-b border-border bg-bg-raised px-6 py-4">
          <div className="flex items-center gap-2">
            <LogoMark size={22} />
            <span className="font-display text-base font-extrabold text-text">
              My Biz Flow — Designer
            </span>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            Every page in the product registers here. {totalPages} page
            {totalPages === 1 ? "" : "s"} across {MODULES.length} modules
            currently registered. A page missing from this list is a page
            the Designer cannot find or customize — that is a bug, not an
            edge case. See DESIGN_SYSTEM.md §8.
          </p>
        </header>

        <div className="p-6">
          <div className="flex flex-col gap-6">
            {pagesByModule.map(({ mod, pages }) => (
              <section
                key={mod.slug}
                className="rounded-lg border border-border bg-bg-raised"
              >
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`h-2 w-2 flex-shrink-0 rounded-full ${taxonomyDotClass(mod.taxonomy)}`}
                    />
                    <h2 className="font-display text-base font-bold text-text">
                      {mod.label}
                    </h2>
                    <span className="text-xs text-text-muted">/{mod.slug}</span>
                  </div>
                  <span className="text-xs font-semibold text-text-muted">
                    {pages.length} page{pages.length === 1 ? "" : "s"}
                  </span>
                </div>

                {pages.length === 0 ? (
                  <div className="px-5 py-4 text-sm text-danger">
                    No pages registered for this module — folder exists but
                    nothing calls registerPage(). Check registerAll.ts.
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {pages.map((page) => (
                      <li
                        key={page.id}
                        className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-text">
                              {page.title}
                            </span>
                            {page.superAdminOnly && (
                              <StatusChip variant="warning" label="Super Admin only" />
                            )}
                            <StatusChip variant="neutral" label={page.kind} />
                          </div>
                          <div className="mt-0.5 font-mono text-xs text-text-muted">
                            {page.path}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {page.customizableRegions.map((region) => (
                            <span
                              key={region.key}
                              title={region.label}
                              className="rounded-full border border-border bg-bg px-2.5 py-1 text-[11px] font-medium text-text-muted"
                            >
                              {region.label}
                            </span>
                          ))}
                          <Link
                            href={`/admin/designer/${page.id}`}
                            className="ml-1 text-xs font-semibold text-teal hover:underline"
                          >
                            View →
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <section className="rounded-lg border border-border bg-bg-raised">
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
                  <h2 className="font-display text-base font-bold text-text">Platform</h2>
                  <span className="text-xs text-text-muted">
                    non-vendor pages — not part of any module&apos;s MODULES entry
                  </span>
                </div>
                <span className="text-xs font-semibold text-text-muted">
                  {platformPages.length} page{platformPages.length === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="divide-y divide-border">
                {platformPages.map((page) => (
                  <li
                    key={page.id}
                    className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text">{page.title}</span>
                        {page.superAdminOnly && (
                          <StatusChip variant="warning" label="Super Admin only" />
                        )}
                        <StatusChip variant="neutral" label={page.kind} />
                      </div>
                      <div className="mt-0.5 font-mono text-xs text-text-muted">{page.path}</div>
                    </div>
                    <Link
                      href={`/admin/designer/${page.id}`}
                      className="text-xs font-semibold text-teal hover:underline"
                    >
                      View →
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="mt-8 rounded-lg border border-border bg-bg-sunken p-5 text-sm text-text-muted">
            Region chips above are the customization surface, not yet a live
            editor — clicking through to change a table's columns or a
            module's pipeline stages is a follow-up build. This pass
            guarantees every page is <em>discoverable and enumerable</em>
            here first, which is the precondition for making it editable.
          </div>
        </div>
      </div>
    </SuperAdminGate>
  );
}
