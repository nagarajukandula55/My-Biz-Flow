import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import type { Column, Row } from "@/components/DataTable";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listEmployees } from "@/lib/hrms";
import { HrmsClientTable } from "./HrmsClientTable";

registerPage({
  id: "hrms.list",
  moduleSlug: "hrms",
  title: "HRMS / Payroll — Employees",
  path: "/partner/[partnerId]/hrms",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Lists every Employee (Prisma-backed — a table deliberately separate from PartnerStaff) with a \"+ New Employee\" action and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/hrms/page.tsx",
});

export const dynamic = "force-dynamic";

const columns: Column[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "department", label: "Department", type: "text" },
  { key: "designation", label: "Designation", type: "text" },
  { key: "reportingManagerName", label: "Reporting Manager", type: "text" },
  { key: "contact", label: "Contact", type: "text" },
  { key: "status", label: "Status", type: "text" },
];

export default async function HrmsPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("hrms");
  const employees = await listEmployees(params.partnerId);
  const byId = new Map(employees.map((e) => [e.id, e]));
  const rows: Row[] = employees.map((e) => ({
    id: e.id,
    name: e.name,
    department: e.department ?? "",
    designation: e.designation ?? "",
    reportingManagerName: e.reportingManagerId ? byId.get(e.reportingManagerId)?.name ?? "" : "",
    contact: e.contact ?? "",
    status: e.status,
  }));

  return (
    <AppShell
      topbarTitle={mod?.label ?? "HRMS / Payroll"}
      topbarActions={
        <Link href={`/partner/${params.partnerId}/hrms/new`} className="btn-accent">
          + New Employee
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <HrmsClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
