import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { PosClientTable } from "./PosClientTable";
import { PosNewButton } from "./PosNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { posColumns } from "@/lib/sample-data/pos";
import { listBusinessRecords } from "@/lib/businessRecords";
import { requirePosStaff } from "@/lib/pos/posAuth";

export const dynamic = "force-dynamic";

registerPage({
  id: "pos.list",
  moduleSlug: "pos",
  title: "POS — List",
  path: "/partner/[partnerId]/pos",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation:
    "Lists every sale record for the pos module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view. Real data — Prisma-backed (BusinessRecord table, scoped to this partner). Gated behind POS's own staff login (requirePosStaff, src/lib/pos/posAuth.ts) — a visitor with no POS staff session is redirected to /pos/staff/login rather than the main partner login.",
  sourceFile: "src/app/partner/[partnerId]/pos/page.tsx",
});

export default async function PosPage({ params }: { params: { partnerId: string } }) {
  const staff = await requirePosStaff(params.partnerId);
  const mod = await getModule("pos");
  const columns = await applyCustomizations("pos.list", posColumns);
  const rows = await listBusinessRecords(params.partnerId, "pos");

  return (
    <AppShell
      topbarTitle={mod?.label ?? "POS"}
      topbarActions={
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">
            {staff.name} ({staff.staffCode}) ·{" "}
            <Link href={`/partner/${params.partnerId}/pos/staff/logout`} className="hover:underline">
              Sign out
            </Link>
          </span>
          <PosNewButton partnerId={params.partnerId} />
        </div>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <PosClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
