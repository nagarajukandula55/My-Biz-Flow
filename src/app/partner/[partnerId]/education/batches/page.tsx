import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { type Column, type Row } from "@/components/DataTable";
import { listBatches } from "@/lib/education";
import { BatchesClientTable } from "./BatchesClientTable";

registerPage({
  id: "education.batches.list",
  moduleSlug: "education",
  title: "Batches — List",
  path: "/partner/[partnerId]/education/batches",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation: "Real Prisma-backed Batch catalog for the education module — each batch belongs to a Course and carries a capacity checked against active Enrollments before a new enrollment is allowed.",
  sourceFile: "src/app/partner/[partnerId]/education/batches/page.tsx",
});

export const dynamic = "force-dynamic";

const STATUS_VARIANT = {
  Upcoming: "teal",
  Ongoing: "success",
  Completed: "neutral",
  Cancelled: "danger",
} as const;

const columns: Column[] = [
  { key: "batchName", label: "Batch Name", type: "text" },
  { key: "courseName", label: "Course", type: "text" },
  { key: "startDateLabel", label: "Start Date", type: "text" },
  { key: "endDateLabel", label: "End Date", type: "text" },
  { key: "capacityLabel", label: "Capacity", type: "text" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
];

export default async function EducationBatchesPage({ params }: { params: { partnerId: string } }) {
  const batches = await listBatches(params.partnerId);
  const rows: Row[] = batches.map((b) => ({
    id: b.id,
    batchName: b.batchName,
    courseName: b.course.name,
    startDateLabel: b.startDate ? b.startDate.toISOString().slice(0, 10) : "—",
    endDateLabel: b.endDate ? b.endDate.toISOString().slice(0, 10) : "—",
    capacityLabel: b.capacity ?? "Unlimited",
    status: b.status,
  }));

  return (
    <AppShell
      topbarTitle="Batches"
      topbarActions={
        <div className="flex items-center gap-2">
          <Link href={`/partner/${params.partnerId}/education`} className="btn-outline">
            &larr; Education
          </Link>
          <Link href={`/partner/${params.partnerId}/education/batches/new`} className="btn-accent">
            + New Batch
          </Link>
        </div>
      }
    >
      <div>
        <p className="text-sm text-text-muted">
          Batches, each against a Course. Open a batch to enroll students, manage fee installments, and mark
          class attendance.
        </p>
        <div className="mt-6">
          <BatchesClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
