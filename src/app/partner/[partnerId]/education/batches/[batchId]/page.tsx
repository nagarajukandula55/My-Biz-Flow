import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import Link from "next/link";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import {
  getBatch,
  listEnrollmentsForBatch,
  listAvailableStudentsForBatch,
  listCourses,
  countActiveEnrollments,
  listClassAttendanceForBatchDate,
} from "@/lib/education";
import { updateBatchAction } from "../actions";
import { EnrollmentsSection } from "./EnrollmentsSection";
import { AttendanceSection } from "./AttendanceSection";

registerPage({
  id: "education.batches.detail",
  moduleSlug: "education",
  title: "Batches — Detail",
  path: "/partner/[partnerId]/education/batches/[batchId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Batch fields" },
    { key: "enrollments", label: "Enrollments panel" },
    { key: "attendance", label: "Attendance panel" },
  ],
  explanation: "Detail view of a real Batch (Prisma): its own editable fields, an Enrollments panel (enroll a student, fail-closed against Batch.capacity, per-enrollment fee installments), and a date-scoped Class Attendance marking panel.",
  sourceFile: "src/app/partner/[partnerId]/education/batches/[batchId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function EducationBatchDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; batchId: string };
  searchParams?: { updated?: string; date?: string };
}) {
  const batch = await getBatch(params.partnerId, params.batchId);
  if (!batch) notFound();

  const [courses, enrollments, availableStudents, activeCount] = await Promise.all([
    listCourses(params.partnerId),
    listEnrollmentsForBatch(params.partnerId, params.batchId),
    listAvailableStudentsForBatch(params.partnerId, params.batchId),
    countActiveEnrollments(params.batchId),
  ]);

  const atCapacity = batch.capacity != null && batch.capacity > 0 && activeCount >= batch.capacity;

  const date = searchParams?.date ?? new Date().toISOString().slice(0, 10);
  const attendanceForDate = await listClassAttendanceForBatchDate(params.partnerId, params.batchId, new Date(date));
  const attendanceMap = Object.fromEntries(attendanceForDate.map((a) => [a.studentId, a.status as "Present" | "Absent" | "Late"]));
  const activeStudents = enrollments
    .filter((e) => e.status === "Active")
    .map((e) => ({ id: e.student.id, name: e.student.name }));

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
    <AppShell
      topbarTitle={batch.batchName}
      topbarActions={
        <Link href={`/partner/${params.partnerId}/education/batches`} className="btn-outline">
          &larr; Batches
        </Link>
      }
    >
      <div className="space-y-6">
        {searchParams?.updated === "1" && (
          <p className="text-sm font-semibold text-success">Batch updated.</p>
        )}

        <div className="rounded-md border border-border bg-bg-raised p-4">
          <h2 className="font-display text-base font-bold text-text">Batch Details</h2>
          <p className="mt-1 text-xs text-text-muted">
            {activeCount} active enrollment{activeCount === 1 ? "" : "s"}
            {batch.capacity != null ? ` / ${batch.capacity} seats` : " (unlimited seats)"}
            {atCapacity && <span className="ml-2 font-semibold text-danger">Full</span>}
          </p>
          <div className="mt-4">
            <RecordForm
              fields={fields}
              initialValues={{
                courseId: batch.courseId,
                batchName: batch.batchName,
                startDate: batch.startDate ? batch.startDate.toISOString().slice(0, 10) : "",
                endDate: batch.endDate ? batch.endDate.toISOString().slice(0, 10) : "",
                status: batch.status,
                capacity: batch.capacity ?? "",
              }}
              submitLabel="Save changes"
              action={updateBatchAction.bind(null, params.partnerId, params.batchId)}
            />
          </div>
        </div>

        <EnrollmentsSection
          partnerId={params.partnerId}
          batchId={params.batchId}
          enrollments={enrollments.map((e) => ({
            id: e.id,
            status: e.status,
            student: { id: e.student.id, name: e.student.name },
            feeInstallments: e.feeInstallments.map((i) => ({
              id: i.id,
              dueDate: i.dueDate.toISOString(),
              amount: i.amount,
              paidAt: i.paidAt ? i.paidAt.toISOString() : null,
              paidAmount: i.paidAmount,
            })),
          }))}
          availableStudents={availableStudents.map((s) => ({ id: s.id, name: s.name }))}
          atCapacity={atCapacity}
        />

        <AttendanceSection
          partnerId={params.partnerId}
          batchId={params.batchId}
          date={date}
          students={activeStudents}
          initialStatuses={attendanceMap}
        />
      </div>
    </AppShell>
  );
}
