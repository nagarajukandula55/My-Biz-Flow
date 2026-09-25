import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import Link from "next/link";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { getStudent } from "@/lib/education";
import { updateStudentAction } from "../actions";

registerPage({
  id: "education.students.edit",
  moduleSlug: "education",
  title: "Education — Students — Edit",
  path: "/partner/[partnerId]/education/students/[studentId]",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Edit form for a real Student row (Prisma), pre-populated from the database and persisted via updateStudentAction.",
  sourceFile: "src/app/partner/[partnerId]/education/students/[studentId]/page.tsx",
});

export const dynamic = "force-dynamic";

const fields: FormFieldDef[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "contact", label: "Contact", type: "phone", required: false },
  { key: "email", label: "Email", type: "email", required: false },
  { key: "guardianName", label: "Guardian Name", type: "text", required: false },
  { key: "guardianContact", label: "Guardian Contact", type: "phone", required: false },
];

export default async function EducationStudentDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; studentId: string };
  searchParams?: { updated?: string };
}) {
  const student = await getStudent(params.partnerId, params.studentId);
  if (!student) notFound();

  return (
    <AppShell
      topbarTitle="Edit Student"
      topbarActions={
        <Link href={`/partner/${params.partnerId}/education/students`} className="btn-outline">
          &larr; Students
        </Link>
      }
    >
      <div>
        <h1 className="font-display text-xl font-bold text-text">{student.name}</h1>
        {searchParams?.updated === "1" && (
          <p className="mt-1 text-sm font-semibold text-success">Student updated.</p>
        )}
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{
              name: student.name,
              contact: student.contact ?? "",
              email: student.email ?? "",
              guardianName: student.guardianName ?? "",
              guardianContact: student.guardianContact ?? "",
            }}
            submitLabel="Save changes"
            action={updateStudentAction.bind(null, params.partnerId, params.studentId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
