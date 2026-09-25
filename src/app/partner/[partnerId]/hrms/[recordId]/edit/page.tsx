import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getEmployee, listEmployees } from "@/lib/hrms";
import { updateEmployeeAction } from "../../actions";

registerPage({
  id: "hrms.edit",
  moduleSlug: "hrms",
  title: "HRMS / Payroll — Edit Employee",
  path: "/partner/[partnerId]/hrms/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Edits an existing Employee row — name/contact/email/department/designation/reporting manager/joining date/status.",
  sourceFile: "src/app/partner/[partnerId]/hrms/[recordId]/edit/page.tsx",
});

export default async function EditHrmsPage({ params }: { params: { partnerId: string; recordId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("hrms");
  const employee = await getEmployee(params.partnerId, params.recordId);
  if (!employee) notFound();
  const employees = (await listEmployees(params.partnerId)).filter((e) => e.id !== employee.id);

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
    <AppShell topbarTitle={`Edit Employee — ${mod?.label ?? "HRMS / Payroll"}`}>
      <div>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-text">Edit Employee</h1>
          <Link href={`/partner/${params.partnerId}/hrms/${employee.id}`} className="btn-outline">
            &larr; Back
          </Link>
        </div>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{
              name: employee.name,
              contact: employee.contact ?? "",
              email: employee.email ?? "",
              department: employee.department ?? "",
              designation: employee.designation ?? "",
              reportingManagerId: employee.reportingManagerId ?? "",
              joiningDate: employee.joiningDate ? new Date(employee.joiningDate).toISOString().slice(0, 10) : "",
              status: employee.status,
            }}
            submitLabel="Save changes"
            action={updateEmployeeAction.bind(null, params.partnerId, employee.id)}
          />
        </div>
      </div>
    </AppShell>
  );
}
