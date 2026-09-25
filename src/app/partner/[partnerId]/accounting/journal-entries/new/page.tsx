import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { listChartOfAccounts } from "@/lib/accounting";
import { createJournalEntryAction } from "../../actions";
import { JournalEntryForm } from "../JournalEntryForm";

registerPage({
  id: "accounting.journal-entries.create",
  moduleSlug: "accounting",
  title: "Accounting — New Journal Entry",
  path: "/partner/[partnerId]/accounting/journal-entries/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Creates a new JournalEntry with its JournalLines. Auto-numbers via getNextNumber('accounting.journal-entry', ...). Rejects with a clear error if the entry's debits and credits don't balance, or if Entry Date falls inside a closed Fiscal Period.",
  sourceFile: "src/app/partner/[partnerId]/accounting/journal-entries/new/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function NewJournalEntryPage({ params }: { params: { partnerId: string } }) {
  const accounts = await listChartOfAccounts(params.partnerId);
  const accountOptions = accounts.filter((a) => a.isActive).map((a) => ({ id: a.id, accountCode: a.accountCode, accountName: a.accountName }));

  return (
    <AppShell topbarTitle="New Journal Entry">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Journal Entry</h1>
        <p className="mt-1 text-sm text-text-muted">
          Total debits must equal total credits before this can be saved.
        </p>
        {accountOptions.length === 0 && (
          <p className="mt-4 rounded-md border border-dashed border-border bg-bg-raised p-4 text-sm text-text-muted">
            No active accounts yet — add accounts under Chart of Accounts first.
          </p>
        )}
        <div className="mt-6">
          <JournalEntryForm
            accountOptions={accountOptions}
            submitLabel="Create Entry"
            action={createJournalEntryAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
