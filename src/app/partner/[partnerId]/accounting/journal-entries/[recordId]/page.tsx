import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { notFound } from "next/navigation";
import { registerPage } from "@/lib/designer/registry";
import { getJournalEntry, listChartOfAccounts, isDateInClosedPeriod } from "@/lib/accounting";
import { updateJournalEntryAction } from "../../actions";
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

        {locked ? (
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
      </div>
    </AppShell>
  );
}
