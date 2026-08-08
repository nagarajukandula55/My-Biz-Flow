import Link from "next/link";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { listAccessGroups } from "@/lib/designer/accessGroupsData";
import { AccessGroupClientTable } from "./AccessGroupClientTable";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.access-groups.list",
  moduleSlug: "platform",
  title: "Access Groups — List",
  path: "/admin/access-groups",
  kind: "list",
  superAdminOnly: true,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation:
    "Platform-level RBAC: an Access Group is a named bundle of per-page, per-action permissions, created once here and reused across every vendor type. Roles are built out of Access Groups (see Roles), and per vendor type only certain Roles are made assignable — see CLAUDE.md's three-level model. Real data — Prisma-backed (AccessGroup table).",
  sourceFile: "src/app/admin/(protected)/access-groups/page.tsx",
});

export default async function AccessGroupsPage() {
  const accessGroups = await listAccessGroups();
  const rows = accessGroups.map((g) => ({
    id: g.id,
    description: g.description,
    pagesGranted: g.pagePermissions.filter((p) => p.view || p.edit || p.delete || p.other).length,
  }));

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
            A named bundle of per-page permissions, defined once here and reused across every vendor. Roles
            are built by combining one or more Access Groups — see Roles in the sidebar.
          </p>
          <div className="mt-6">
            {rows.length === 0 ? (
              <p className="rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
                No Access Groups yet. Create one to start building out Roles.
              </p>
            ) : (
              <AccessGroupClientTable rows={rows} />
            )}
          </div>
        </div>
      </div>
    </SuperAdminGate>
  );
}
