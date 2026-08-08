import { AppShell } from "@/components/AppShell";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RoleClientTable } from "./RoleClientTable";

registerPage({
  id: "roles.list",
  moduleSlug: "platform",
  title: "Roles — List",
  path: "/vendor/[vendorId]/admin/roles",
  kind: "list",
  superAdminOnly: true,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation:
    "Vendor-account-level RBAC: a Role is a bundle of Access Groups (e.g. \"Cashier\" = [\"Sales Floor\"]). Users are assigned exactly one Role — see CLAUDE.md's three-level model.",
  sourceFile: "src/app/vendor/[vendorId]/admin/roles/page.tsx",
});

export default function RolesPage({ params }: { params: { vendorId: string } }) {
  return (
    <AppShell
      navGroups={buildVendorAdminNavGroups("roles")}
      topbarTitle="Roles"
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/admin/roles/new`} className="btn-accent">
          + New Role
        </Link>
      }
    >
      <SuperAdminGate>
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Roles</h1>
          <p className="mt-1 text-sm text-text-muted">
            A bundle of Access Groups. Users are assigned a Role — see Users
            in the sidebar.
          </p>
          <div className="mt-6">
            <RoleClientTable vendorId={params.vendorId} />
          </div>
        </div>
      </SuperAdminGate>
    </AppShell>
  );
}
