import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { listCourses } from "@/lib/education";
import { createBatchAction } from "../actions";

registerPage({
  id: "education.batches.create",
  moduleSlug: "education",
  title: "Batches — Create",
  path: "/partner/[partnerId]/education/batches/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "Creation form for a real Batch row (Prisma) against a selected Course, with its seat capacity.",
  sourceFile: "src/app/partner/[partnerId]/education/batches/new/page.tsx",
});

export default async function NewEducationBatchPage({ params }: { params: { partnerId: string } }) {
  const courses = await listCourses(params.partnerId);

  const fields: FormFieldDef[] = [
    {
      key: "courseId",
      label: "Course",
      type: "select",
      required: true,
      options: courses.map((c) => c.id),
      optionLabels: Object.fromEntries(courses.map((c) => [c.id, c.name])),
    },
    { key: "batchName", label: "Batch Name", type: "text", required: true },
    { key: "startDate", label: "Start Date", type: "date", required: false },
    { key: "endDate", label: "End Date", type: "date", required: false },
    { key: "status", label: "Status", type: "select", required: true, options: ["Upcoming", "Ongoing", "Completed", "Cancelled"] },
    { key: "capacity", label: "Capacity", type: "number", required: false, help: "Leave blank for unlimited." },
  ];

  return (
    <AppShell topbarTitle="New Batch">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Batch</h1>
        <p className="mt-1 text-xs text-text-muted">Create a new batch against a course, with its seat capacity.</p>
        {courses.length === 0 && (
          <p className="mt-4 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning">
            No courses yet — create a course first.
          </p>
        )}
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Batch"
            action={createBatchAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
