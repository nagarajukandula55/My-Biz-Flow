import Link from "next/link";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { AccessGroupClientTable } from "./AccessGroupClientTable";

registerPage({
  id: "platform.access-groups.list",
  moduleSlug: "platform",
  title: "Access Groups — List",
  path: "/admin/access-groups",
  kind: "list",
  superAdminOnly: true,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation:
    "Platform-level RBAC: an Access Group is a named bundle of module slugs (e.g. \"Sales Floor\" = POS + Billing + Inventory), created once here and reused across every vendor type. Roles are built out of Access Groups (see Roles), and per vendor type only certain Roles are made assignable — see CLAUDE.md's three-level model.",
  sourceFile: "src/app/admin/(protected)/access-groups/page.tsx",
});

export default function AccessGroupsPage() {
  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="flex items-center justify-between border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Access Groups</h1>
          <Link href="/admin/access-groups/new" className="btn-accent">
            + New Access Group
          </Link>
        </div>
        <div className="p-6">
          <p className="text-sm text-text-muted">
            A named bundle of module slugs, defined once here and reused across every vendor. Roles are built
            by combining one or more Access Groups — see Roles in the sidebar.
          </p>
          <div className="mt-6">
            <AccessGroupClientTable />
          </div>
        </div>
      </div>
    </SuperAdminGate>
  );
}
