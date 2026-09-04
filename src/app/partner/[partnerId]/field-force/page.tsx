import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusChip } from "@/components/StatusChip";
import { registerPage } from "@/lib/designer/registry";
import { listEngineers } from "@/lib/fieldForce/engineersData";

registerPage({
  id: "field-force.list",
  moduleSlug: "field-force",
  title: "Field Force — Engineers",
  path: "/partner/[partnerId]/field-force",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation:
    "The recruited engineer pool — platform-wide, not scoped to any one partner (an engineer isn't owned by a brand, they're matched to brands' jobs). Shows every engineer onboarded so far, their services, and status. Real data — Prisma-backed (Engineer table).",
  sourceFile: "src/app/partner/[partnerId]/field-force/page.tsx",
});

export const dynamic = "force-dynamic";

const columns: Column[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "phone", label: "Phone", type: "phone" },
  { key: "services", label: "Services", type: "multi-chip" },
  { key: "areaCount", label: "Serviceable Areas", type: "text" },
  {
    key: "status",
    label: "Status",
    type: "select-chip",
    chipVariantMap: { active: "success", pending: "warning", suspended: "danger" },
  },
];

export default async function FieldForcePage({ params }: { params: { partnerId: string } }) {
  const engineers = await listEngineers();
  const rows = engineers.map((e) => ({
    id: e.id,
    name: e.name,
    phone: e.phone,
    services: e.services.map((s) => s.name),
    areaCount: `${e.serviceAreas.length} area${e.serviceAreas.length === 1 ? "" : "s"}`,
    status: e.status,
  }));

  return (
    <AppShell topbarTitle="Field Force">
      <div className="mbf-page">
        <div className="flex items-center justify-between border-b border-border bg-bg-raised px-6 py-4">
          <div>
            <h1 className="font-display text-lg font-bold text-text">Field Force — Engineers</h1>
            <p className="mt-1 text-sm text-text-muted">
              {engineers.length} engineer{engineers.length === 1 ? "" : "s"} onboarded so far.
            </p>
          </div>
          <Link href={`/partner/${params.partnerId}/field-force/onboard`} className="btn-accent">
            + Onboard Engineer
          </Link>
        </div>
        <div className="p-6">
          {rows.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
              No engineers onboarded yet.{" "}
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
