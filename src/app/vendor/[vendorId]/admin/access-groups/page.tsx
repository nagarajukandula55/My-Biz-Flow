import { AppShell } from "@/components/AppShell";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { AccessGroupClientTable } from "./AccessGroupClientTable";

registerPage({
  id: "access-groups.list",
  moduleSlug: "platform",
  title: "Access Groups — List",
  path: "/vendor/[vendorId]/admin/access-groups",
  kind: "list",
  superAdminOnly: true,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation:
    "Vendor-account-level RBAC: an Access Group is a named bundle of module slugs (e.g. \"Sales Floor\" = POS + Billing + Inventory). Roles are built out of Access Groups, and Users are assigned a Role — see CLAUDE.md's three-level model.",
  sourceFile: "src/app/vendor/[vendorId]/admin/access-groups/page.tsx",
});

export default async function AccessGroupsPage({ params }: { params: { vendorId: string } }) {
  return (
    <AppShell
      topbarTitle="Access Groups"
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/admin/access-groups/new`} className="btn-accent">
          + New Access Group
        </Link>
      }
    >
      <SuperAdminGate>
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Access Groups</h1>
          <p className="mt-1 text-sm text-text-muted">
            A named bundle of module slugs. Roles are built by combining one
            or more Access Groups — see Roles in the sidebar.
          </p>
          <div className="mt-6">
            <AccessGroupClientTable vendorId={params.vendorId} />
          </div>
        </div>
      </SuperAdminGate>
    </AppShell>
  );
}
