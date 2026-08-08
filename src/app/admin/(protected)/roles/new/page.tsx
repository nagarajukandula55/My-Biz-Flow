import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { listAccessGroups } from "@/lib/designer/accessGroupsData";
import { createRoleAction } from "../actions";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.roles.create",
  moduleSlug: "platform",
  title: "Roles — Create",
  path: "/admin/roles/new",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Creation form for a new Role — name, description, and the Access Groups it bundles. Writes to the Role Prisma table.",
  sourceFile: "src/app/admin/(protected)/roles/new/page.tsx",
});

export default async function NewRolePage() {
  const accessGroups = await listAccessGroups();

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">New Role</h1>
        </div>
        <div className="p-6">
          <form action={createRoleAction}>
            <div className="max-w-lg space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Role Name
                </label>
                <input
                  name="id"
                  required
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={2}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Access Groups
                </label>
                {accessGroups.length === 0 ? (
                  <p className="text-sm text-text-muted">
                    No Access Groups exist yet — create one first, then come back here.
                  </p>
                ) : (
                  <div className="space-y-1.5 rounded-md border border-border bg-bg p-3">
                    {accessGroups.map((g) => (
                      <label key={g.id} className="flex items-center gap-2 text-sm text-text">
                        <input type="checkbox" name="accessGroupIds" value={g.id} className="h-4 w-4 accent-accent" />
                        {g.id}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <button type="submit" className="btn-accent">
                Create Role
              </button>
            </div>
          </form>
        </div>
      </div>
    </SuperAdminGate>
  );
}
