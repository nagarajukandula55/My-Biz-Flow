import { AppShell } from "@/components/AppShell";
import { renderTierGate } from "@/lib/pageTierGate";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listEmployees } from "@/lib/hrms";
import { createPayslipAction, createAttendancePayslipAction } from "../actions";

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

export default async function NewPayslipPage({ params, searchParams }: { params: { partnerId: string }; searchParams?: { basis?: string } }) {
  const now = new Date();
  await requirePartnerSessionForPage(params.partnerId);
  const tierGate = await renderTierGate(params.partnerId, "hrms.payroll.create", "Payroll");
  if (tierGate) return <AppShell topbarTitle="New Payslip — HRMS / Payroll">{tierGate}</AppShell>;
  const mod = await getModule("hrms");
  const employees = await listEmployees(params.partnerId);
  const attendance = searchParams?.basis === "attendance";

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
  if (attendance) fields.push(
    { key: "workingWeekdays", label: "Working weekdays", type: "multi-select", required: true, options: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] },
    { key: "excludedDates", label: "Holidays / excluded dates (YYYY-MM-DD, comma separated)", type: "text" },
    { key: "paidLeaveDays", label: "Owner-approved paid leave credits (days)", type: "number" },
    { key: "reviewReason", label: "Policy and paid leave review notes", type: "textarea", required: true },
  );

  return (
    <AppShell topbarTitle={`New Payslip — ${mod?.label ?? "HRMS / Payroll"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Payslip</h1>
        <a className="text-teal underline" href={`?basis=${attendance ? "manual" : "attendance"}`}>{attendance ? "Use manual payroll" : "Calculate from attendance"}</a>
        {attendance && <p className="mt-4 text-sm text-text-muted">Completed months only. Present and Late count as one paid day; HalfDay counts as half. Multiple shifts on a date cannot add extra days. Holidays and unselected weekdays are excluded. Missing working days reduce basic pay proportionally; allowances stay unchanged. Enter approved paid leave credits explicitly and record your review. This creates a draft for owner review, not a payment or statutory payroll filing.</p>}
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel={attendance ? "Calculate draft for review" : "Create Payslip"} action={(attendance ? createAttendancePayslipAction : createPayslipAction).bind(null, params.partnerId)} />
        </div>
      </div>
    </AppShell>
  );
}
