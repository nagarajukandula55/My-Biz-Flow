import Link from "next/link";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { listRoles } from "@/lib/designer/rolesData";
import { RoleClientTable } from "./RoleClientTable";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.roles.list",
  moduleSlug: "platform",
  title: "Roles — List",
  path: "/admin/roles",
  kind: "list",
  superAdminOnly: true,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation:
    "Platform-level RBAC: a Role is a named bundle of Access Groups, created once here and reused across every vendor type. Real data — Prisma-backed (Role table).",
  sourceFile: "src/app/admin/(protected)/roles/page.tsx",
});

export default async function RolesPage() {
  const roles = await listRoles();
  const rows = roles.map((r) => ({ id: r.id, description: r.description, accessGroupIds: r.accessGroupIds }));

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
            {rows.length === 0 ? (
              <p className="rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
                No Roles yet. Create Access Groups first, then build Roles out of them.
              </p>
            ) : (
              <RoleClientTable rows={rows} />
            )}
          </div>
        </div>
      </div>
    </SuperAdminGate>
  );
}
