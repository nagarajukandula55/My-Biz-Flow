import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { type Column, type Row } from "@/components/DataTable";
import { listCourses } from "@/lib/education";
import { CoursesClientTable } from "./CoursesClientTable";

registerPage({
  id: "education.courses.list",
  moduleSlug: "education",
  title: "Education — Courses",
  path: "/partner/[partnerId]/education/courses",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation: "Real Prisma-backed Course catalog for the education module (name/duration/fee) — a Batch is created against one of these courses.",
  sourceFile: "src/app/partner/[partnerId]/education/courses/page.tsx",
});

export const dynamic = "force-dynamic";

const columns: Column[] = [
  { key: "name", label: "Course Name", type: "text" },
  { key: "durationWeeksLabel", label: "Duration", type: "text" },
  { key: "feeRupees", label: "Fee", type: "currency" },
  { key: "statusLabel", label: "Status", type: "select-chip", chipVariantMap: { Active: "success", Inactive: "neutral" } },
];

export default async function EducationCoursesPage({ params }: { params: { partnerId: string } }) {
  const courses = await listCourses(params.partnerId);
  const rows: Row[] = courses.map((c) => ({
    id: c.id,
    name: c.name,
    durationWeeksLabel: c.durationWeeks ? `${c.durationWeeks} weeks` : "—",
    feeRupees: c.fee / 100,
    statusLabel: c.isActive ? "Active" : "Inactive",
  }));

  return (
    <AppShell
      topbarTitle="Courses"
      topbarActions={
        <div className="flex items-center gap-2">
          <Link href={`/partner/${params.partnerId}/education`} className="btn-outline">
            &larr; Education
          </Link>
          <Link href={`/partner/${params.partnerId}/education/courses/new`} className="btn-accent">
            + New Course
          </Link>
        </div>
      }
    >
      <div>
        <p className="text-sm text-text-muted">The course catalog batches are created against.</p>
        <div className="mt-6">
          <CoursesClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
