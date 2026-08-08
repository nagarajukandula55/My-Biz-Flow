import Link from "next/link";
import { notFound } from "next/navigation";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { getAccessGroup } from "@/lib/designer/accessGroupsData";
import { DeleteAccessGroupButton } from "./DeleteAccessGroupButton";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.access-groups.detail",
  moduleSlug: "platform",
  title: "Access Groups — Detail",
  path: "/admin/access-groups/[recordId]",
  kind: "detail",
  superAdminOnly: true,
  customizableRegions: [{ key: "field-grid", label: "Detail field grid" }],
  explanation: "Read-only detail view of a single Access Group, with Edit and Delete actions.",
  sourceFile: "src/app/admin/(protected)/access-groups/[recordId]/page.tsx",
});

export default async function AccessGroupDetailPage({ params }: { params: { recordId: string } }) {
  const group = await getAccessGroup(params.recordId);
  if (!group) notFound();

  const grantedPages = group.pagePermissions.filter((p) => p.view || p.edit || p.delete || p.other);

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Access Groups</h1>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-bold text-text">{group.id}</h1>
              <p className="mt-1 text-xs text-text-muted">{group.description || "No description"}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin/access-groups" className="btn-outline">
                &larr; Back
              </Link>
              <Link href={`/admin/access-groups/${group.id}/edit`} className="btn-outline">
                Edit
              </Link>
              <DeleteAccessGroupButton id={group.id} />
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-bg-raised p-5">
            <h2 className="font-display text-base font-bold text-text">
              Pages With Access ({grantedPages.length})
            </h2>
            {grantedPages.length === 0 ? (
              <p className="mt-2 text-sm text-text-muted">No pages granted yet.</p>
            ) : (
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                    <th className="py-2">Page ID</th>
                    <th className="px-3 py-2 text-center">View</th>
                    <th className="px-3 py-2 text-center">Edit</th>
                    <th className="px-3 py-2 text-center">Delete</th>
                    <th className="px-3 py-2 text-center">Other</th>
                  </tr>
                </thead>
                <tbody>
                  {grantedPages.map((p) => (
                    <tr key={p.pageId} className="border-b border-border last:border-b-0">
                      <td className="py-2 font-mono text-xs text-text">{p.pageId}</td>
                      <td className="px-3 py-2 text-center">{p.view ? "✓" : "—"}</td>
                      <td className="px-3 py-2 text-center">{p.edit ? "✓" : "—"}</td>
                      <td className="px-3 py-2 text-center">{p.delete ? "✓" : "—"}</td>
                      <td className="px-3 py-2 text-center">{p.other ? "✓" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </SuperAdminGate>
  );
}
