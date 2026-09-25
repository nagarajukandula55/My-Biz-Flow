import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { type Column, type Row } from "@/components/DataTable";
import { listStudents } from "@/lib/education";
import { StudentsClientTable } from "./StudentsClientTable";

registerPage({
  id: "education.students.list",
  moduleSlug: "education",
  title: "Education — Students",
  path: "/partner/[partnerId]/education/students",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation: "Real Prisma-backed Student directory for the education module — the roster batches enroll from.",
  sourceFile: "src/app/partner/[partnerId]/education/students/page.tsx",
});

export const dynamic = "force-dynamic";

const columns: Column[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "contact", label: "Contact", type: "phone" },
  { key: "email", label: "Email", type: "email" },
  { key: "guardianName", label: "Guardian", type: "text" },
  { key: "guardianContact", label: "Guardian Contact", type: "phone" },
];

export default async function EducationStudentsPage({ params }: { params: { partnerId: string } }) {
  const students = await listStudents(params.partnerId);
  const rows: Row[] = students.map((s) => ({
    id: s.id,
    name: s.name,
    contact: s.contact ?? "",
    email: s.email ?? "",
    guardianName: s.guardianName ?? "",
    guardianContact: s.guardianContact ?? "",
  }));

  return (
    <AppShell
      topbarTitle="Students"
      topbarActions={
        <div className="flex items-center gap-2">
          <Link href={`/partner/${params.partnerId}/education`} className="btn-outline">
            &larr; Education
          </Link>
          <Link href={`/partner/${params.partnerId}/education/students/new`} className="btn-accent">
            + New Student
          </Link>
        </div>
      }
    >
      <div>
        <p className="text-sm text-text-muted">The student roster batches enroll from.</p>
        <div className="mt-6">
          <StudentsClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
