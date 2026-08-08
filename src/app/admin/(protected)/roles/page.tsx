import Link from "next/link";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { RoleClientTable } from "./RoleClientTable";

registerPage({
  id: "platform.roles.list",
  moduleSlug: "platform",
  title: "Roles — List",
  path: "/admin/roles",
  kind: "list",
  superAdminOnly: true,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation:
    "Platform-level RBAC: a Role is a named bundle of Access Groups, created once here and reused across every vendor type. Which Roles are assignable per vendor type is configured separately (module-set gating) — see CLAUDE.md's three-level model.",
  sourceFile: "src/app/admin/(protected)/roles/page.tsx",
});

export default function RolesPage() {
  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="flex items-center justify-between border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Roles</h1>
          <Link href="/admin/roles/new" className="btn-accent">
            + New Role
          </Link>
        </div>
        <div className="p-6">
          <p className="text-sm text-text-muted">
            A named bundle of one or more Access Groups, defined once here and reused across every vendor.
            Users are then assigned a Role at the vendor level.
          </p>
          <div className="mt-6">
            <RoleClientTable />
          </div>
        </div>
      </div>
    </SuperAdminGate>
  );
}
