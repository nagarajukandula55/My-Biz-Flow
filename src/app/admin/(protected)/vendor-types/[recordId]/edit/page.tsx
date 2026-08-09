import { notFound } from "next/navigation";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { getVendorType } from "@/lib/designer/vendorTypesData";
import { listRoles } from "@/lib/designer/rolesData";
import { getAssignablePagesByModule } from "@/lib/designer/accessGroupPermissions";
import { listPlans } from "@/lib/plansData";
import { ModulesAndTiersEditor } from "../../ModulesAndTiersEditor";
import { updateVendorTypeAction } from "../../actions";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.vendor-types.edit",
  moduleSlug: "platform",
  title: "Vendor Types — Edit",
  path: "/admin/vendor-types/[recordId]/edit",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Edit form for an existing Vendor Type, writing to the VendorType Prisma table.",
  sourceFile: "src/app/admin/(protected)/vendor-types/[recordId]/edit/page.tsx",
});

export default async function EditVendorTypePage({ params }: { params: { recordId: string } }) {
  const type = await getVendorType(params.recordId);
  if (!type) notFound();
  const roles = await listRoles();
  const pagesByModule = getAssignablePagesByModule();
  const plans = await listPlans();
  const updateAction = updateVendorTypeAction.bind(null, type.id);

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Edit Vendor Type</h1>
        </div>
        <div className="p-6">
          <p className="mb-6 text-sm text-text-muted">{type.id}</p>
          <form action={updateAction}>
            <div className="max-w-2xl space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={type.description}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                />
              </div>

              <ModulesAndTiersEditor
                pagesByModule={pagesByModule}
                initialModules={type.defaultModules}
                initialPlanTierByPage={type.planTierByPage}
              />

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Assignable Roles
                </label>
                <div className="space-y-1.5 rounded-md border border-border bg-bg p-3">
                  {roles.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-sm text-text">
                      <input
                        type="checkbox"
                        name="assignableRoleIds"
                        value={r.id}
                        defaultChecked={type.assignableRoleIds.includes(r.id)}
                        className="h-4 w-4 accent-accent"
                      />
                      {r.id}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Pricing Plans Bundled
                </label>
                <p className="mb-2 text-xs text-text-muted">
                  Which of the 3 real Plans (billing/pricing) this Vendor Type offers at signup — separate from
                  the page-tier breakdown above.
                </p>
                {plans.length === 0 ? (
                  <p className="text-sm text-text-muted">No Plans exist yet — create one at Plans first.</p>
                ) : (
                  <div className="space-y-1.5 rounded-md border border-border bg-bg p-3">
                    {plans.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm text-text">
                        <input
                          type="checkbox"
                          name="planIds"
                          value={p.id}
                          defaultChecked={type.planIds.includes(p.id)}
                          className="h-4 w-4 accent-accent"
                        />
                        {p.name} — ₹{p.price.toLocaleString("en-IN")}/{p.billingCycle}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    name="requiresApproval"
                    defaultChecked={type.requiresApproval}
                    className="h-4 w-4 accent-accent"
                  />
                  Require Super Admin approval before assigning a Vendor ID
                </label>
                <p className="mt-1 text-xs text-text-muted">
                  When on, signups against this type go to a review queue instead of getting a VND#### id
                  immediately.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue={type.status}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
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
