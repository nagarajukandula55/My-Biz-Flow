import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { createStudentAction } from "../actions";

registerPage({
  id: "education.students.create",
  moduleSlug: "education",
  title: "Education — Students — Create",
  path: "/partner/[partnerId]/education/students/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Creation form for a real Student row (Prisma), persisted via createStudentAction.",
  sourceFile: "src/app/partner/[partnerId]/education/students/new/page.tsx",
});

const fields: FormFieldDef[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "contact", label: "Contact", type: "phone", required: false },
  { key: "email", label: "Email", type: "email", required: false },
  { key: "guardianName", label: "Guardian Name", type: "text", required: false },
  { key: "guardianContact", label: "Guardian Contact", type: "phone", required: false },
];

export default async function NewEducationStudentPage({ params }: { params: { partnerId: string } }) {
  return (
    <AppShell topbarTitle="New Student">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Student</h1>
        <p className="mt-1 text-xs text-text-muted">Add a student to the roster.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Student"
            action={createStudentAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
