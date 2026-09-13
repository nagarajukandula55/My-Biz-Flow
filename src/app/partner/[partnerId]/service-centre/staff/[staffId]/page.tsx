import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { getPartnerStaff, PARTNER_STAFF_ROLES } from "@/lib/partnerStaff";
import { updatePartnerStaffAction } from "@/lib/serviceCentreStaffActions";

registerPage({
  id: "service-centre.staff.edit",
  moduleSlug: "service-centre",
  title: "Service Centre — Edit Staff",
  path: "/partner/[partnerId]/service-centre/staff/[staffId]",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Edits a PartnerStaff account's profile/role/status. Password changes go through Reset Password on the staff list instead.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/staff/[staffId]/page.tsx",
});

export const dynamic = "force-dynamic";

const staffEditFormFields: FormFieldDef[] = [
  { key: "name", label: "Full Name", type: "text", required: true },
  { key: "email", label: "Email (login)", type: "email", required: true },
  { key: "phone", label: "Phone", type: "phone" },
  { key: "role", label: "Role", type: "select", required: true, options: [...PARTNER_STAFF_ROLES] },
  { key: "status", label: "Status", type: "select", required: true, options: ["Active", "Suspended"] },
];

export default async function EditServiceCentreStaffPage({
  params,
}: {
  params: { partnerId: string; staffId: string };
}) {
  const staff = await getPartnerStaff(params.partnerId, params.staffId);
  if (!staff) notFound();

  const action = updatePartnerStaffAction.bind(null, params.partnerId, params.staffId);

  return (
    <AppShell topbarTitle="Edit Staff">
      <div className="max-w-xl">
        <h1 className="font-display text-xl font-bold text-text">{staff.name}</h1>
        <p className="mt-1 text-sm text-text-muted">Edit this staff member&apos;s profile, role, or status.</p>
        <div className="mt-6">
          <RecordForm
            fields={staffEditFormFields}
            initialValues={{ name: staff.name, email: staff.email, phone: staff.phone ?? "", role: staff.role, status: staff.status }}
            submitLabel="Save Changes"
            action={action}
          />
        </div>
      </div>
    </AppShell>
  );
}
