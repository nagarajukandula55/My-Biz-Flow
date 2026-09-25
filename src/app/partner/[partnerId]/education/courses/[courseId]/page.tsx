import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import Link from "next/link";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { getCourse } from "@/lib/education";
import { updateCourseAction } from "../actions";

registerPage({
  id: "education.courses.edit",
  moduleSlug: "education",
  title: "Education — Courses — Edit",
  path: "/partner/[partnerId]/education/courses/[courseId]",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Edit form for a real Course row (Prisma), pre-populated from the database and persisted via updateCourseAction.",
  sourceFile: "src/app/partner/[partnerId]/education/courses/[courseId]/page.tsx",
});

export const dynamic = "force-dynamic";

const fields: FormFieldDef[] = [
  { key: "name", label: "Course Name", type: "text", required: true },
  { key: "durationWeeks", label: "Duration (weeks)", type: "number", required: false },
  { key: "fee", label: "Fee (₹)", type: "currency", required: true, help: "Stored internally in paise." },
  { key: "isActive", label: "Active", type: "boolean", required: false },
];

export default async function EducationCourseDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; courseId: string };
  searchParams?: { updated?: string };
}) {
  const course = await getCourse(params.partnerId, params.courseId);
  if (!course) notFound();

  return (
    <AppShell
      topbarTitle="Edit Course"
      topbarActions={
        <Link href={`/partner/${params.partnerId}/education/courses`} className="btn-outline">
          &larr; Courses
        </Link>
      }
    >
      <div>
        <h1 className="font-display text-xl font-bold text-text">{course.name}</h1>
        {searchParams?.updated === "1" && (
          <p className="mt-1 text-sm font-semibold text-success">Course updated.</p>
        )}
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{
              name: course.name,
              durationWeeks: course.durationWeeks ?? "",
              fee: course.fee / 100,
              isActive: course.isActive,
            }}
            submitLabel="Save changes"
            action={updateCourseAction.bind(null, params.partnerId, params.courseId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
