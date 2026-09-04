import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { DataTable } from "@/components/DataTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { educationBatchColumns } from "@/lib/sample-data/education";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "education.batches.list",
  moduleSlug: "education",
  title: "Batches — List",
  path: "/partner/[partnerId]/education/batches",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation: "Partner-owned batch catalog for the education module — each batch carries a maxSeats capacity that createEnrollmentAction checks against existing enrollments before allowing a new one.",
  sourceFile: "src/app/partner/[partnerId]/education/batches/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function EducationBatchesPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("education.batches.list", educationBatchColumns);
  const rows = await listBusinessRecords(params.partnerId, "education-batches");

  return (
    <AppShell
      topbarTitle="Batches"
      topbarActions={
        <Link href={`/partner/${params.partnerId}/education/batches/new`} className="btn-accent">
          + New Batch
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">
          Batches used by enrollment&apos;s Batch field. Max Seats enforces enrollment capacity.
        </p>
        <div className="mt-6">
          <DataTable columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
