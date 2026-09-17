import { AppShell } from "@/components/AppShell";
import { renderTierGate } from "@/lib/pageTierGate";
import { registerPage } from "@/lib/designer/registry";
import { ScStaffNameClientTable } from "./ScStaffNameClientTable";
import { ScStaffNameNewButton } from "./ScStaffNameNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { scStaffNameColumns } from "@/lib/sample-data/service-centre-staff-names";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "service-centre.staff-names.list",
  moduleSlug: "service-centre",
  title: "Staff Names — List",
  path: "/partner/[partnerId]/service-centre/staff-names",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation:
    "A partner-owned roster of the staff NAMES that go on a workorder's three mandatory who-did-this fields — Logged By (CCO) at intake, and Engineer / Serviced By plus Collected By at handover. It is a name list, not a login: no password, no account, no session, and no job assignment anywhere in Service Centre (the old Technician roster and its assignment picker were removed outright). Maintaining the roster is a Pro feature (service-centre.staff-names.* in DEFAULT_PAGE_TIERS), exactly like the Brands and Models catalogs; a partner with entries here gets them offered as suggestions on all three fields, while a Starter partner just types a name each time. Real persistence (BusinessRecord, Prisma-backed).",
  sourceFile: "src/app/partner/[partnerId]/service-centre/staff-names/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ScStaffNameListPage({ params }: { params: { partnerId: string } }) {
  const tierGate = await renderTierGate(params.partnerId, "service-centre.staff-names.list", "Staff Names");
  if (tierGate) return <AppShell topbarTitle={"Staff Names"}>{tierGate}</AppShell>;

  const columns = await applyCustomizations("service-centre.staff-names.list", scStaffNameColumns);
  const rows = await listBusinessRecords(params.partnerId, "service-centre-staff-names");

  return (
    <AppShell topbarTitle="Staff Names" topbarActions={<ScStaffNameNewButton partnerId={params.partnerId} />}>
      <div>
        <p className="text-xs text-text-muted">
          The names offered as suggestions on Logged By, Engineer / Serviced By and Collected By. Adding a name here
          never creates a login — Service Centre has one login for the whole business.
        </p>
        <div className="mt-2">
          <ScStaffNameClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
