import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { notFound } from "next/navigation";
import { registerPage } from "@/lib/designer/registry";
import { getJournalEntry, listChartOfAccounts, isDateInClosedPeriod } from "@/lib/accounting";
import { updateJournalEntryAction, reverseJournalAction } from "../../actions";
import { prisma } from "@/lib/prisma";
import { RecordForm } from "@/components/RecordForm";
import { DataTable } from "@/components/DataTable";
import { JournalEntryForm } from "../JournalEntryForm";

registerPage({
  id: "accounting.journal-entries.detail",
  moduleSlug: "accounting",
  title: "Accounting — Journal Entry Detail",
  path: "/partner/[partnerId]/accounting/journal-entries/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Edits an existing JournalEntry and its lines (delete + recreate) — re-validates double-entry balance and blocks the save if either the old or new Entry Date falls inside a closed Fiscal Period.",
  sourceFile: "src/app/partner/[partnerId]/accounting/journal-entries/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function JournalEntryDetailPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const entry = await getJournalEntry(params.partnerId, params.recordId);
  if (!entry) notFound();
  const reversal = await prisma.journalEntry.findFirst({ where: { partnerId: params.partnerId, sourceType: "journal-reversal", sourceRecordId: entry.id }, select: { id: true, entryNumber: true } });
  const retained = entry.sourceType === "journal-reversal" || Boolean(reversal);

  const [accounts, locked] = await Promise.all([
    listChartOfAccounts(params.partnerId),
    isDateInClosedPeriod(params.partnerId, entry.entryDate),
  ]);
  const accountOptions = accounts.filter((a) => a.isActive || a.id).map((a) => ({ id: a.id, accountCode: a.accountCode, accountName: a.accountName }));

  return (
    <AppShell topbarTitle="Journal Entry">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-text">{entry.entryNumber}</h1>
            <p className="mt-1 text-sm text-text-muted">{entry.id}</p>
          </div>
          <Link href={`/partner/${params.partnerId}/accounting/journal-entries`} className="btn-outline">
            &larr; Back
          </Link>
        </div>

        <p className="mt-4 text-sm text-text-muted">{entry.narration}</p>
        <div className="mt-4"><DataTable columns={[{ key: "account", label: "Account", type: "text" }, { key: "debit", label: "Debit (Rs)", type: "text" }, { key: "credit", label: "Credit (Rs)", type: "text" }]} rows={entry.lines.map(line => ({ id: line.id, account: line.accountName, debit: (line.debit / 100).toFixed(2), credit: (line.credit / 100).toFixed(2) }))} /></div>
        {reversal && <Link className="btn-outline mt-4" href={`/partner/${params.partnerId}/accounting/journal-entries/${reversal.id}`}>Open reversal {reversal.entryNumber}</Link>}
        {entry.sourceType === "journal-reversal" && entry.sourceRecordId && <Link className="btn-outline mt-4" href={`/partner/${params.partnerId}/accounting/journal-entries/${entry.sourceRecordId}`}>Open original journal</Link>}
        {retained ? <p className="mt-4 text-sm text-text-muted">Original and reversal entries are retained without further edits.</p> : locked ? (
          <div className="mt-6 rounded-md border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
            This entry is dated inside a closed fiscal period and can no longer be edited. Reopen the period first if a correction is required.
          </div>
        ) : (
          <div className="mt-6">
            <JournalEntryForm
              accountOptions={accountOptions}
              initialValues={{ entryDate: entry.entryDate.toISOString().slice(0, 10), narration: entry.narration ?? "" }}
              initialLines={entry.lines.map((l) => ({ accountId: l.accountId, debit: l.debit / 100, credit: l.credit / 100 }))}
              submitLabel="Save changes"
              action={updateJournalEntryAction.bind(null, params.partnerId, entry.id)}
            />
          </div>
        )}
        {!retained && <section className="mt-8">
          <h2 className="font-display text-xl font-bold text-text">Reverse this journal</h2>
          <p className="my-3 text-sm text-text-muted">Creates an equal and opposite journal and retains the original. Choose an open period on or after the original date; a closed original period stays unchanged. This does not refund money, cancel an invoice or file a tax adjustment.</p>
          <RecordForm fields={[{ key: "reversalDate", label: "Reversal date", type: "date", required: true }, { key: "reason", label: "Reason for reversal", type: "textarea", required: true }]} submitLabel="Create reversal" action={reverseJournalAction.bind(null, params.partnerId, entry.id)} />
        </section>}
      </div>
    </AppShell>
  );
}
