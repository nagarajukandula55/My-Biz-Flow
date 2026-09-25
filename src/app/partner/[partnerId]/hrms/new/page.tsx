import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listEmployees } from "@/lib/hrms";
import { createEmployeeAction } from "../actions";

registerPage({
  id: "hrms.create",
  moduleSlug: "hrms",
  title: "HRMS / Payroll — New Employee",
  path: "/partner/[partnerId]/hrms/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Creates a new Employee row (Prisma-backed) — name/contact/email/department/designation/reporting manager (self-relation, selectable from other Employees of the same partner)/joining date/status.",
  sourceFile: "src/app/partner/[partnerId]/hrms/new/page.tsx",
});

export default async function NewHrmsPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("hrms");
  const employees = await listEmployees(params.partnerId);

  const fields: FormFieldDef[] = [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "contact", label: "Contact", type: "phone", required: false },
    { key: "email", label: "Email", type: "email", required: false },
    { key: "department", label: "Department", type: "text", required: false },
    { key: "designation", label: "Designation", type: "text", required: false },
    {
      key: "reportingManagerId",
      label: "Reporting Manager",
      type: "select",
      required: false,
      options: employees.map((e) => e.id),
      optionLabels: Object.fromEntries(employees.map((e) => [e.id, e.name])),
    },
    { key: "joiningDate", label: "Joining Date", type: "date", required: false },
    { key: "status", label: "Status", type: "select", required: false, options: ["Active", "OnLeave", "Resigned", "Terminated"] },
  ];

  return (
    <AppShell topbarTitle={`New Employee — ${mod?.label ?? "HRMS / Payroll"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Employee</h1>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Employee" action={createEmployeeAction.bind(null, params.partnerId)} />
        </div>
      </div>
    </AppShell>
  );
}
