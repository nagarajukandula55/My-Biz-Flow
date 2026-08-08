import { notFound } from "next/navigation";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { getAccessGroup } from "@/lib/designer/accessGroupsData";
import { getAssignablePagesByModule } from "@/lib/designer/accessGroupPermissions";
import { AccessGroupPermissionsEditor } from "../../AccessGroupPermissionsEditor";
import { updateAccessGroupAction } from "../../actions";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.access-groups.edit",
  moduleSlug: "platform",
  title: "Access Groups — Edit",
  path: "/admin/access-groups/[recordId]/edit",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Edit form for an existing Access Group, writing to the AccessGroup Prisma table.",
  sourceFile: "src/app/admin/(protected)/access-groups/[recordId]/edit/page.tsx",
});

export default async function EditAccessGroupPage({ params }: { params: { recordId: string } }) {
  const group = await getAccessGroup(params.recordId);
  if (!group) notFound();

  const updateAction = updateAccessGroupAction.bind(null, group.id);

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Edit Access Group</h1>
        </div>
        <div className="p-6">
          <p className="mb-6 text-sm text-text-muted">{group.id}</p>
          <form action={updateAction}>
            <div className="max-w-lg">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                Description
              </label>
              <textarea
                name="description"
                rows={2}
                defaultValue={group.description}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
            </div>

            <div className="mt-8">
              <AccessGroupPermissionsEditor
                pagesByModule={getAssignablePagesByModule()}
                initialPermissions={group.pagePermissions}
              />
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
