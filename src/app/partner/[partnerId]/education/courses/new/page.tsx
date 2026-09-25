import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { createCourseAction } from "../actions";

registerPage({
  id: "education.courses.create",
  moduleSlug: "education",
  title: "Education — Courses — Create",
  path: "/partner/[partnerId]/education/courses/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Creation form for a real Course row (Prisma), persisted via createCourseAction.",
  sourceFile: "src/app/partner/[partnerId]/education/courses/new/page.tsx",
});

const fields: FormFieldDef[] = [
  { key: "name", label: "Course Name", type: "text", required: true },
  { key: "durationWeeks", label: "Duration (weeks)", type: "number", required: false },
  { key: "fee", label: "Fee (₹)", type: "currency", required: true, help: "Stored internally in paise." },
  { key: "isActive", label: "Active", type: "boolean", required: false },
];

export default async function NewEducationCoursePage({ params }: { params: { partnerId: string } }) {
  return (
    <AppShell topbarTitle="New Course">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Course</h1>
        <p className="mt-1 text-xs text-text-muted">Add a course to the catalog.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Course"
            action={createCourseAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
