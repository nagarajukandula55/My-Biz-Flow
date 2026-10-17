import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EmployeeAccessForm } from "@/components/EmployeeAccessForm";
import { listEmployees } from "@/lib/hrms";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { assertModuleAccess } from "@/lib/tenant";
import { registerPage } from "@/lib/designer/registry";
registerPage({ id: "hrms.employee-access", moduleSlug: "hrms", title: "Employee attendance access", path: "/partner/[partnerId]/hrms/employee-access", kind: "form", superAdminOnly: false,
  customizableRegions: [], explanation: "Business owners issue, reset or disable dedicated employee attendance credentials. No existing staff role or business access is modified.", sourceFile: "src/app/partner/[partnerId]/hrms/employee-access/page.tsx" });
export const dynamic = "force-dynamic";
export default async function EmployeeAccessPage({ params }: { params: { partnerId: string } }) {
  await requireSessionPartnerId(params.partnerId);
  await assertModuleAccess(params.partnerId, "hrms");
  const employees = await listEmployees(params.partnerId);
  return <AppShell topbarTitle="Employee attendance access"><p className="mb-4 text-sm text-text-muted">Issue or reset a dedicated attendance login. This does not grant business management access. Disabling access signs the employee out on their next request.</p>
    <Link className="mb-4 inline-flex min-h-11 items-center text-teal underline" href={`/partner/${params.partnerId}/hrms/employee`}>Open employee sign-in page</Link>
    <EmployeeAccessForm partnerId={params.partnerId} employees={employees.map(e => ({ id: e.id, name: `${e.name} (${e.status})` }))} />
  </AppShell>;
}
