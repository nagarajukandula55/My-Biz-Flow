import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listEmployees } from "@/lib/hrms";
import { createPayslipAction } from "../actions";

registerPage({
  id: "hrms.payroll.create",
  moduleSlug: "hrms",
  title: "HRMS / Payroll — New Payslip",
  path: "/partner/[partnerId]/hrms/payroll/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Creates/replaces a Payslip for an employee+month+year (basicPay/allowances/deductions entered in rupees, converted to paise; netPay computed = basicPay+allowances-deductions). Status starts Draft.",
  sourceFile: "src/app/partner/[partnerId]/hrms/payroll/new/page.tsx",
});

const now = new Date();

export default async function NewPayslipPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("hrms");
  const employees = await listEmployees(params.partnerId);

  const fields: FormFieldDef[] = [
    {
      key: "employeeId",
      label: "Employee",
      type: "select",
      required: true,
      options: employees.map((e) => e.id),
      optionLabels: Object.fromEntries(employees.map((e) => [e.id, e.name])),
    },
    { key: "month", label: "Month (1-12)", type: "number", required: true, placeholder: String(now.getMonth() + 1) },
    { key: "year", label: "Year", type: "number", required: true, placeholder: String(now.getFullYear()) },
    { key: "basicPay", label: "Basic Pay (Rs)", type: "currency", required: true },
    { key: "allowances", label: "Allowances (Rs)", type: "currency", required: false },
    { key: "deductions", label: "Deductions (Rs)", type: "currency", required: false },
  ];

  return (
    <AppShell topbarTitle={`New Payslip — ${mod?.label ?? "HRMS / Payroll"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Payslip</h1>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Payslip" action={createPayslipAction.bind(null, params.partnerId)} />
        </div>
      </div>
    </AppShell>
  );
}
