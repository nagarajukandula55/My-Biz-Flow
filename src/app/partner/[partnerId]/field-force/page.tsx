import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusChip } from "@/components/StatusChip";
import { registerPage } from "@/lib/designer/registry";
import { listProviders } from "@/lib/fieldForce/providersData";

registerPage({
  id: "field-force.list",
  moduleSlug: "field-force",
  title: "Field Force — Providers",
  path: "/partner/[partnerId]/field-force",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation:
    "This partner's onboarded Provider pool — skilled and unskilled workers, onboarded by ops or self-signed-up, who fulfill this partner's bookings. Shows every provider, their services, pincode, and status. Real data — Prisma-backed (Provider table).",
  sourceFile: "src/app/partner/[partnerId]/field-force/page.tsx",
});

export const dynamic = "force-dynamic";

const columns: Column[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "phone", label: "Phone", type: "phone" },
  { key: "pincode", label: "Pincode", type: "text" },
  { key: "services", label: "Services", type: "multi-chip" },
  { key: "areaCount", label: "Extra Areas", type: "text" },
  {
    key: "skillLevel",
    label: "Worker Type",
    type: "select-chip",
    chipVariantMap: { skilled: "teal", unskilled: "neutral" },
  },
  {
    key: "status",
    label: "Status",
    type: "select-chip",
    chipVariantMap: { active: "success", pending: "warning", suspended: "danger" },
  },
];

export default async function FieldForcePage({ params }: { params: { partnerId: string } }) {
  const providers = await listProviders(params.partnerId);
  const rows = providers.map((p) => ({
    id: p.id,
    name: p.name,
    phone: p.phone,
    pincode: p.pincode,
    services: p.services.map((s) => s.name),
    areaCount: `${p.serviceAreas.length} area${p.serviceAreas.length === 1 ? "" : "s"}`,
    skillLevel: p.skillLevel,
    status: p.status,
  }));

  return (
    <AppShell topbarTitle="Field Force">
      <div className="mbf-page">
        <div className="flex items-center justify-between border-b border-border bg-bg-raised px-6 py-4">
          <div>
            <h1 className="font-display text-lg font-bold text-text">Field Force — Providers</h1>
            <p className="mt-1 text-sm text-text-muted">
              {providers.length} provider{providers.length === 1 ? "" : "s"} onboarded so far.
            </p>
          </div>
          <Link href={`/partner/${params.partnerId}/field-force/onboard`} className="btn-accent">
            + Onboard Provider
          </Link>
        </div>
        <div className="p-6">
          {rows.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
              No providers onboarded yet.{" "}
              <StatusChip label="Not yet configured" variant="neutral" className="ml-1" />
            </p>
          ) : (
            <DataTable columns={columns} rows={rows} />
          )}
        </div>
      </div>
    </AppShell>
  );
}
