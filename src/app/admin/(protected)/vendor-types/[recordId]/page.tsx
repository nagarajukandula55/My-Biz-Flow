import Link from "next/link";
import { notFound } from "next/navigation";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { StatusChip } from "@/components/StatusChip";
import { registerPage } from "@/lib/designer/registry";
import { getVendorType } from "@/lib/designer/vendorTypesData";
import { DeleteVendorTypeButton } from "./DeleteVendorTypeButton";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.vendor-types.detail",
  moduleSlug: "platform",
  title: "Vendor Types — Detail",
  path: "/admin/vendor-types/[recordId]",
  kind: "detail",
  superAdminOnly: true,
  customizableRegions: [{ key: "field-grid", label: "Detail field grid" }],
  explanation: "Read-only detail view of a single Vendor Type, with Edit and Delete actions.",
  sourceFile: "src/app/admin/(protected)/vendor-types/[recordId]/page.tsx",
});

export default async function VendorTypeDetailPage({ params }: { params: { recordId: string } }) {
  const type = await getVendorType(params.recordId);
  if (!type) notFound();

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Vendor Types</h1>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold text-text">{type.id}</h1>
                <StatusChip label={type.status} variant={type.status === "Active" ? "success" : "neutral"} />
              </div>
              <p className="mt-1 text-xs text-text-muted">{type.description || "No description"}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin/vendor-types" className="btn-outline">
                &larr; Back
              </Link>
              <Link href={`/admin/vendor-types/${type.id}/edit`} className="btn-outline">
                Edit
              </Link>
              <DeleteVendorTypeButton id={type.id} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InfoCard title="Default Modules" items={type.defaultModules} />
            <InfoCard title="Assignable Roles" items={type.assignableRoleIds} />
            <InfoCard title="Available Plans" items={type.planIds} />
          </div>
        </div>
      </div>
    </SuperAdminGate>
  );
}

function InfoCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-border bg-bg-raised p-5">
      <h2 className="font-display text-sm font-bold text-text">
        {title} ({items.length})
      </h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-text-muted">None set.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item} className="rounded-full border border-border bg-bg px-3 py-1.5 text-xs font-medium text-text">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
