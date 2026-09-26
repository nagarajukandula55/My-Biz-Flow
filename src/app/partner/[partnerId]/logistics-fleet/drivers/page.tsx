import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import type { Column, Row } from "@/components/DataTable";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listDrivers } from "@/lib/logisticsFleet";
import { DriversClientTable } from "./DriversClientTable";

registerPage({
  id: "logistics-fleet.drivers.list",
  moduleSlug: "logistics-fleet",
  title: "Logistics / Fleet — Drivers",
  path: "/partner/[partnerId]/logistics-fleet/drivers",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation: "Lists every Driver (Prisma-backed) in this partner's fleet — name, phone, active status — with a \"+ New Driver\" action and row-click navigation into that driver's own detail/edit page.",
  sourceFile: "src/app/partner/[partnerId]/logistics-fleet/drivers/page.tsx",
});

export const dynamic = "force-dynamic";

const columns: Column[] = [
  { key: "name", label: "Driver Name", type: "text" },
  { key: "phone", label: "Phone", type: "text" },
  { key: "isActive", label: "Active", type: "boolean" },
];

export default async function DriversPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("logistics-fleet");
  const drivers = await listDrivers(params.partnerId);
  const rows: Row[] = drivers.map((d) => ({
    id: d.id,
    name: d.name,
    phone: d.phone ?? "",
    isActive: d.isActive,
  }));

  return (
    <AppShell
      topbarTitle={`Drivers — ${mod?.label ?? "Logistics / Fleet"}`}
      topbarActions={
        <Link href={`/partner/${params.partnerId}/logistics-fleet/drivers/new`} className="btn-accent">
          + New Driver
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">Every driver registered in this partner's fleet.</p>
        <div className="mt-6">
          <DriversClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
