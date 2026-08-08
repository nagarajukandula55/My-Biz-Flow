import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { listRoles } from "@/lib/designer/rolesData";
import { getAssignablePagesByModule } from "@/lib/designer/accessGroupPermissions";
import { ModulesAndTiersEditor } from "../ModulesAndTiersEditor";
import { createVendorTypeAction } from "../actions";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.vendor-types.create",
  moduleSlug: "platform",
  title: "Vendor Types — Create",
  path: "/admin/vendor-types/new",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation:
    "Creation form for a new Vendor Type — default modules, its own Basic/Pro/Ultimate page-tier breakdown, and assignable Roles. Writes to the VendorType Prisma table.",
  sourceFile: "src/app/admin/(protected)/vendor-types/new/page.tsx",
});

export default async function NewVendorTypePage() {
  const roles = await listRoles();
  const pagesByModule = getAssignablePagesByModule();

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">New Vendor Type</h1>
        </div>
        <div className="p-6">
          <form action={createVendorTypeAction}>
            <div className="max-w-2xl space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Vendor Type Name
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

              <ModulesAndTiersEditor pagesByModule={pagesByModule} />

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Assignable Roles
                </label>
                {roles.length === 0 ? (
                  <p className="text-sm text-text-muted">No Roles exist yet — create one first.</p>
                ) : (
                  <div className="space-y-1.5 rounded-md border border-border bg-bg p-3">
                    {roles.map((r) => (
                      <label key={r.id} className="flex items-center gap-2 text-sm text-text">
                        <input type="checkbox" name="assignableRoleIds" value={r.id} className="h-4 w-4 accent-accent" />
                        {r.id}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-text">
                  <input type="checkbox" name="requiresApproval" className="h-4 w-4 accent-accent" />
                  Require Super Admin approval before assigning a Vendor ID
                </label>
                <p className="mt-1 text-xs text-text-muted">
                  Off by default. When on, signups against this type go to a review queue instead of getting
                  a VND#### id immediately.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue="Active"
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <button type="submit" className="btn-accent">
                Create Vendor Type
              </button>
            </div>
          </form>
        </div>
      </div>
    </SuperAdminGate>
  );
}
