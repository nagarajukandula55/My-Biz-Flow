import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { createPartnerStaffAction } from "@/lib/serviceCentreStaffActions";
import { PARTNER_STAFF_ROLES } from "@/lib/partnerStaff";

registerPage({
  id: "service-centre.staff.new",
  moduleSlug: "service-centre",
  title: "Service Centre — Add Staff",
  path: "/partner/[partnerId]/service-centre/staff/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Creates a real PartnerStaff account with a freshly generated one-time password (shown once on redirect back to the staff list) — mirrors the Partner signup flow's own password-generation convention.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/staff/new/page.tsx",
});

const staffFormFields: FormFieldDef[] = [
  { key: "name", label: "Full Name", type: "text", required: true },
  { key: "email", label: "Email (login)", type: "email", required: true },
  { key: "phone", label: "Phone", type: "phone" },
  { key: "role", label: "Role", type: "select", required: true, options: [...PARTNER_STAFF_ROLES] },
];

export default function NewServiceCentreStaffPage({ params }: { params: { partnerId: string } }) {
  const action = createPartnerStaffAction.bind(null, params.partnerId);

  return (
    <AppShell topbarTitle="Add Staff">
      <div className="max-w-xl">
        <h1 className="font-display text-xl font-bold text-text">Add Staff</h1>
        <p className="mt-1 text-sm text-text-muted">
          A one-time password is generated automatically and shown once after saving — share it with the staff
          member so they can sign in at their staff login page and set their own password.
        </p>
        <div className="mt-6">
          <RecordForm fields={staffFormFields} submitLabel="Create Staff Account" action={action} />
        </div>
      </div>
    </AppShell>
  );
}
