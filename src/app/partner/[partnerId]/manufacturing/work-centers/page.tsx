import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { registerPage } from "@/lib/designer/registry";
import { WorkCentersClientTable } from "./WorkCentersClientTable";
import { listWorkCenters } from "@/lib/manufacturing";

registerPage({
  id: "manufacturing.work-centers.list",
  moduleSlug: "manufacturing",
  title: "Manufacturing — Work Centers",
  path: "/partner/[partnerId]/manufacturing/work-centers",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Lists every WorkCenter (Prisma-backed) — a physical production line/station a ProductionOrder can be scheduled against. capacityPerDay is informational only in this pass, no capacity-booking engine.",
  sourceFile: "src/app/partner/[partnerId]/manufacturing/work-centers/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function WorkCentersListPage({ params }: { params: { partnerId: string } }) {
  const workCenters = await listWorkCenters(params.partnerId);
  const rows = workCenters.map((w) => ({
    id: w.id,
    name: w.name,
    capacityPerDay: w.capacityPerDay ?? "—",
    statusLabel: w.isActive ? "Active" : "Inactive",
  }));

  return (
    <AppShell
      topbarTitle="Work Centers"
      topbarActions={
        <Link href={`/partner/${params.partnerId}/manufacturing/work-centers/new`} className="btn-accent">
          + New Work Center
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">Production lines/stations a Production Order can be scheduled against.</p>
        <div className="mt-6">
          <WorkCentersClientTable partnerId={params.partnerId} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
