import Link from "next/link";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { VendorTypeClientTable } from "./VendorTypeClientTable";

registerPage({
  id: "platform.vendor-types.list",
  moduleSlug: "platform",
  title: "Vendor Types — List",
  path: "/admin/vendor-types",
  kind: "list",
  superAdminOnly: true,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation:
    "The top-level platform entity a vendor account is created against — POS Retailer, Service Centre, Clinic, etc. Each Vendor Type bundles a default module set, which platform Roles are assignable to that type's users, and which Plans apply. Drives Signup (pick a type), Pricing (per type), and role-based access downstream.",
  sourceFile: "src/app/admin/(protected)/vendor-types/page.tsx",
});

export default function VendorTypesPage() {
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
            <VendorTypeClientTable />
          </div>
        </div>
      </div>
    </SuperAdminGate>
  );
}
