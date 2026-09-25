import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listEmployees } from "@/lib/hrms";
import { createLeaveRequestAction } from "../actions";

registerPage({
  id: "hrms.leave.create",
  moduleSlug: "hrms",
  title: "HRMS / Payroll — New Leave Request",
  path: "/partner/[partnerId]/hrms/leave/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Raises a new LeaveRequest for an employee (leaveType/startDate/endDate/reason), status defaults Pending — fires the hrmsLeaveRequestSubmitted Telegram alert on submit.",
  sourceFile: "src/app/partner/[partnerId]/hrms/leave/new/page.tsx",
});

const LEAVE_TYPES = ["Casual", "Sick", "Earned", "Unpaid"];

export default async function NewLeaveRequestPage({ params }: { params: { partnerId: string } }) {
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
    { key: "leaveType", label: "Leave Type", type: "select", required: true, options: LEAVE_TYPES },
    { key: "startDate", label: "Start Date", type: "date", required: true },
    { key: "endDate", label: "End Date", type: "date", required: true },
    { key: "reason", label: "Reason", type: "textarea", required: false },
  ];

  return (
    <AppShell topbarTitle={`Request Leave — ${mod?.label ?? "HRMS / Payroll"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Request Leave</h1>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Submit Request" action={createLeaveRequestAction.bind(null, params.partnerId)} />
        </div>
      </div>
    </AppShell>
  );
}
