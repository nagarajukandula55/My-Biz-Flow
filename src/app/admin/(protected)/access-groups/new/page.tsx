import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { getAssignablePagesByModule } from "@/lib/designer/accessGroupPermissions";
import { AccessGroupPermissionsEditor } from "../AccessGroupPermissionsEditor";
import { createAccessGroupAction } from "../actions";

registerPage({
  id: "platform.access-groups.create",
  moduleSlug: "platform",
  title: "Access Groups — Create",
  path: "/admin/access-groups/new",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation:
    "Creation form for a new Access Group — name, description, and a per-page/per-action permission matrix. Writes to the AccessGroup Prisma table.",
  sourceFile: "src/app/admin/(protected)/access-groups/new/page.tsx",
});

export default function NewAccessGroupPage() {
  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">New Access Group</h1>
        </div>
        <div className="p-6">
          <form action={createAccessGroupAction}>
            <div className="max-w-lg space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Access Group Name
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
            </div>

            <div className="mt-8">
              <AccessGroupPermissionsEditor pagesByModule={getAssignablePagesByModule()} />
            </div>

            <div className="mt-6">
              <button type="submit" className="btn-accent">
                Create Access Group
              </button>
            </div>
          </form>
        </div>
      </div>
    </SuperAdminGate>
  );
}
