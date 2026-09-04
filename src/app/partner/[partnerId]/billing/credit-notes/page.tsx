import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { CreditNotesClientTable } from "./CreditNotesClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { creditNoteColumns } from "@/lib/sample-data/billing-credit-notes";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "billing.credit-notes.list",
  moduleSlug: "billing",
  title: "Billing — Credit/Debit Notes",
  path: "/partner/[partnerId]/billing/credit-notes",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every Credit Note / Debit Note issued against a Billing contact, with a \"+ New\" action and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/billing/credit-notes/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function CreditNotesPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("billing.credit-notes.list", creditNoteColumns);
  const rows = await listBusinessRecords(params.partnerId, "billing-credit-notes");

  return (
    <AppShell
      topbarTitle="Credit / Debit Notes"
      topbarActions={
        <Link href={`/partner/${params.partnerId}/billing/credit-notes/new`} className="btn-accent">
          + New Note
        </Link>
      }
    >
      <div>
        <div className="mt-2">
          <CreditNotesClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
