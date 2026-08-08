import { notFound } from "next/navigation";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { getRole } from "@/lib/designer/rolesData";
import { listAccessGroups } from "@/lib/designer/accessGroupsData";
import { updateRoleAction } from "../../actions";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.roles.edit",
  moduleSlug: "platform",
  title: "Roles — Edit",
  path: "/admin/roles/[recordId]/edit",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Edit form for an existing Role, writing to the Role Prisma table.",
  sourceFile: "src/app/admin/(protected)/roles/[recordId]/edit/page.tsx",
});

export default async function EditRolePage({ params }: { params: { recordId: string } }) {
  const role = await getRole(params.recordId);
  if (!role) notFound();
  const accessGroups = await listAccessGroups();
  const updateAction = updateRoleAction.bind(null, role.id);

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Edit Role</h1>
        </div>
        <div className="p-6">
          <p className="mb-6 text-sm text-text-muted">{role.id}</p>
          <form action={updateAction}>
            <div className="max-w-lg space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={role.description}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Access Groups
                </label>
                <div className="space-y-1.5 rounded-md border border-border bg-bg p-3">
                  {accessGroups.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 text-sm text-text">
                      <input
                        type="checkbox"
                        name="accessGroupIds"
                        value={g.id}
                        defaultChecked={role.accessGroupIds.includes(g.id)}
                        className="h-4 w-4 accent-accent"
                      />
                      {g.id}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button type="submit" className="btn-accent">
                Save changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </SuperAdminGate>
  );
}
