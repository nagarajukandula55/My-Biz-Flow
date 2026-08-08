import Link from "next/link";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { listVendorTypes } from "@/lib/designer/vendorTypesData";
import { VendorTypeClientTable } from "./VendorTypeClientTable";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.vendor-types.list",
  moduleSlug: "platform",
  title: "Vendor Types — List",
  path: "/admin/vendor-types",
  kind: "list",
  superAdminOnly: true,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation:
    "The top-level platform entity a vendor account is created against — POS Retailer, Service Centre, Clinic, etc. Each Vendor Type bundles a default module set, which platform Roles are assignable to that type's users, and which Plans apply. Real data — Prisma-backed (VendorType table).",
  sourceFile: "src/app/admin/(protected)/vendor-types/page.tsx",
});

export default async function VendorTypesPage() {
  const vendorTypes = await listVendorTypes();
  const rows = vendorTypes.map((t) => ({
    id: t.id,
    description: t.description,
    defaultModules: t.defaultModules,
    assignableRoleIds: t.assignableRoleIds,
    planIds: t.planIds,
    status: t.status,
  }));

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="flex items-center justify-between border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Vendor Types</h1>
          <Link href="/admin/vendor-types/new" className="btn-accent">
            + New Vendor Type
          </Link>
        </div>
        <div className="p-6">
          <p className="text-sm text-text-muted">
            Each Vendor Type bundles a default module set, the platform Roles assignable to its users, and
            which Plans apply. Signup, Pricing, and login/role-based access all key off this.
          </p>
          <div className="mt-6">
            {rows.length === 0 ? (
              <p className="rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
                No Vendor Types yet. Create Roles first, then define types built out of them.
              </p>
            ) : (
              <VendorTypeClientTable rows={rows} />
            )}
          </div>
        </div>
      </div>
    </SuperAdminGate>
  );
}
