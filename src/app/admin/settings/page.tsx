import { SuperAdminGate } from "@/components/SuperAdminGate";
import { LogoMark } from "@/components/LogoMark";
import { StatusChip } from "@/components/StatusChip";
import { PageAccessToggle } from "@/components/PageAccessToggle";
import { getRegisteredPages, registerPage } from "@/lib/designer/registry";
import "@/lib/designer/registerAll";
import { getAllPublicPageIds } from "@/lib/designer/pageAccess";

registerPage({
  id: "platform.settings",
  moduleSlug: "platform",
  title: "Platform Settings",
  path: "/admin/settings",
  kind: "admin",
  superAdminOnly: true,
  customizableRegions: [],
  explanation:
    "Platform-level settings, distinct from a Vendor's own /settings. Currently holds the 'make any page public' access toggle: real (enforced by src/middleware.ts via /api/page-access) for pages already gated by SuperAdminGate; shown-but-inert for ordinary vendor pages, which have no gate to begin with yet — see the 'not currently gated' label on those rows, and DESIGN_SYSTEM.md §9.",
  sourceFile: "src/app/admin/settings/page.tsx",
});

export default async function PlatformSettingsPage() {
  const pages = getRegisteredPages();
  const publicPageIds = await getAllPublicPageIds();

  return (
    <SuperAdminGate>
      <div className="min-h-screen w-full bg-bg">
        <header className="border-b border-border bg-bg-raised px-6 py-4">
          <div className="flex items-center gap-2">
            <LogoMark size={22} />
            <span className="font-display text-base font-extrabold text-text">
              My Biz Flow — Platform Settings
            </span>
          </div>
          <p className="mt-1 max-w-[70ch] text-sm text-text-muted">
            Flip any registered page to public access. This is REAL enforcement for pages
            already gated by the Super Admin cookie (middleware checks this list on every
            request) — it has no effect on ordinary vendor pages, which aren&apos;t gated at all
            yet, and are labeled accordingly below rather than implying protection that doesn&apos;t
            exist.
          </p>
        </header>

        <div className="p-6">
          <div className="overflow-hidden rounded-lg border border-border bg-bg-raised">
            <ul className="divide-y divide-border">
              {pages.map((page) => (
                <li
                  key={page.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text">{page.title}</span>
                      {page.superAdminOnly && <StatusChip variant="warning" label="Super Admin only" />}
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-text-muted">{page.path}</div>
                  </div>
                  <PageAccessToggle
                    pageId={page.id}
                    initialPublic={publicPageIds.has(page.id)}
                    isRealGate={page.superAdminOnly}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </SuperAdminGate>
  );
}
