import Link from "next/link";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { listPartnerTypes } from "@/lib/designer/partnerTypesData";
import { PartnerTypeClientTable } from "./PartnerTypeClientTable";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.partner-types.list",
  moduleSlug: "platform",
  title: "Partner Types — List",
  path: "/admin/partner-types",
  kind: "list",
  superAdminOnly: true,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation:
    "The top-level platform entity a partner account is created against — POS Retailer, Service Centre, Clinic, etc. Each Partner Type bundles a default module set, which platform Roles are assignable to that type's users, and its own Basic/Pro/Ultimate page-tier breakdown. Real data — Prisma-backed (PartnerType table).",
  sourceFile: "src/app/admin/(protected)/partner-types/page.tsx",
});

export default async function PartnerTypesPage() {
  const partnerTypes = await listPartnerTypes();
  const rows = partnerTypes.map((t) => ({
    id: t.id,
    description: t.description,
    defaultModules: t.defaultModules,
    assignableRoleIds: t.assignableRoleIds,
    tieredPageCount: Object.keys(t.planTierByPage).length,
    status: t.status,
  }));

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="flex items-center justify-between border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Partner Types</h1>
          <Link href="/admin/partner-types/new" className="btn-accent">
            + New Partner Type
          </Link>
        </div>
        <div className="p-6">
          <p className="text-sm text-text-muted">
            Each Partner Type bundles a default module set, the platform Roles assignable to its users, and
            which Plans apply. Signup, Pricing, and login/role-based access all key off this.
          </p>
          <div className="mt-6">
            {rows.length === 0 ? (
              <p className="rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
                No Partner Types yet. Create Roles first, then define types built out of them.
              </p>
            ) : (
              <PartnerTypeClientTable rows={rows} />
            )}
          </div>
        </div>
      </div>
    </SuperAdminGate>
  );
}
