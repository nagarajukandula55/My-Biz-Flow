import Link from "next/link";
import { notFound } from "next/navigation";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { getRole } from "@/lib/designer/rolesData";
import { DeleteRoleButton } from "./DeleteRoleButton";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.roles.detail",
  moduleSlug: "platform",
  title: "Roles — Detail",
  path: "/admin/roles/[recordId]",
  kind: "detail",
  superAdminOnly: true,
  customizableRegions: [{ key: "field-grid", label: "Detail field grid" }],
  explanation: "Read-only detail view of a single Role, with Edit and Delete actions.",
  sourceFile: "src/app/admin/(protected)/roles/[recordId]/page.tsx",
});

export default async function RoleDetailPage({ params }: { params: { recordId: string } }) {
  const role = await getRole(params.recordId);
  if (!role) notFound();

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Roles</h1>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-bold text-text">{role.id}</h1>
              <p className="mt-1 text-xs text-text-muted">{role.description || "No description"}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin/roles" className="btn-outline">
                &larr; Back
              </Link>
              <Link href={`/admin/roles/${role.id}/edit`} className="btn-outline">
                Edit
              </Link>
              <DeleteRoleButton id={role.id} />
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-bg-raised p-5">
            <h2 className="font-display text-base font-bold text-text">Access Groups ({role.accessGroupIds.length})</h2>
            {role.accessGroupIds.length === 0 ? (
              <p className="mt-2 text-sm text-text-muted">No Access Groups bundled yet.</p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {role.accessGroupIds.map((gid) => (
                  <li key={gid} className="rounded-full border border-border bg-bg px-3 py-1.5 text-xs font-medium text-text">
                    {gid}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </SuperAdminGate>
  );
}
