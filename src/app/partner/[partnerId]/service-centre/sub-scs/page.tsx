import { AppShell } from "@/components/AppShell";
import { renderTierGate } from "@/lib/pageTierGate";
import { registerPage } from "@/lib/designer/registry";
import { DataTable, type Column, type Row } from "@/components/DataTable";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "service-centre.sub-scs",
  moduleSlug: "service-centre",
  title: "Service Centre — Sub-Centres",
  path: "/partner/[partnerId]/service-centre/sub-scs",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation:
    "The sub-centre / multi-branch hierarchy view over SC Profiles (service-centre-sc-profile BusinessRecord data): every profile whose parentScId is empty is a top-level centre, and the profiles pointing at it are its branches. Read-only — the SC Profile CRUD UI that used to write/edit this data was removed (partner-side vendor-onboarding tracking is out of scope for a partner's own logged-in view of their own business); any existing records from the migration script or earlier use still render here. Ultimate-tier only. Ported from AN-CRM's vendor Sub-Vendors page, minus its payment-gateway sub-account provisioning, which has no equivalent here.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/sub-scs/page.tsx",
});

export const dynamic = "force-dynamic";

const CHILD_COLUMNS: Column[] = [
  { key: "id", label: "SC Code", type: "text" },
  { key: "businessName", label: "SC Business Name", type: "text" },
  { key: "onboardingStatus", label: "Onboarding Status", type: "select-chip" },
  { key: "serviceArea", label: "Service Area", type: "text" },
  { key: "serviceRadiusKm", label: "Service Radius (km)", type: "text" },
  { key: "status", label: "Status", type: "select-chip" },
];

export default async function SubScsPage({ params }: { params: { partnerId: string } }) {
  const tierGate = await renderTierGate(params.partnerId, "service-centre.sub-scs", "Sub-Centres");
  if (tierGate) return <AppShell topbarTitle={"Sub-Centres"}>{tierGate}</AppShell>;

  const profiles = await listBusinessRecords(params.partnerId, "service-centre-sc-profile");

  const parents = profiles.filter((p) => !String(p["parentScId"] ?? "").trim());
  const childrenByParent = new Map<string, Row[]>();
  const orphans: Row[] = [];
  const parentIds = new Set(parents.map((p) => String(p["id"])));

  for (const p of profiles) {
    const parentId = String(p["parentScId"] ?? "").trim();
    if (!parentId) continue;
    if (!parentIds.has(parentId)) {
      orphans.push(p);
      continue;
    }
    const list = childrenByParent.get(parentId) ?? [];
    list.push(p);
    childrenByParent.set(parentId, list);
  }

  const totalChildren = profiles.length - parents.length;

  return (
    <AppShell topbarTitle="Sub-Centres">
      <div>
        <p className="text-sm text-text-muted">
          {parents.length} top-level centre{parents.length === 1 ? "" : "s"} and {totalChildren} sub-centre
          {totalChildren === 1 ? "" : "s"}. Read-only hierarchy view over existing SC Profile data.
        </p>

        {parents.length === 0 && (
          <div className="mt-4 rounded-lg border border-border bg-bg-raised p-4 text-sm text-text-muted">
            No SC Profiles yet.
          </div>
        )}

        {parents.map((parent) => {
          const id = String(parent["id"]);
          const children = childrenByParent.get(id) ?? [];
          return (
            <section key={id} className="mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-base font-bold text-text">
                    {String(parent["businessName"] ?? id)}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {id} · {children.length} sub-centre{children.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                {children.length === 0 ? (
                  <div className="rounded-lg border border-border bg-bg-raised p-4 text-sm text-text-muted">
                    No sub-centres under this centre.
                  </div>
                ) : (
                  <DataTable columns={CHILD_COLUMNS} rows={children} />
                )}
              </div>
            </section>
          );
        })}

        {orphans.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-base font-bold text-text">Unmatched parent references</h2>
            <p className="mt-0.5 text-xs text-text-muted">
              These profiles name a Parent SC Code that does not match any existing SC Profile.
            </p>
            <div className="mt-3">
              <DataTable
                columns={[{ key: "parentScId", label: "Parent SC Code", type: "text" }, ...CHILD_COLUMNS]}
                rows={orphans}
              />
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
