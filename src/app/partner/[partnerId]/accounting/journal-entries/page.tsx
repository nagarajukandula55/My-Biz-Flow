import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { registerPage } from "@/lib/designer/registry";
import { formatDate, formatCurrencyINR } from "@/lib/format";
import { listJournalEntries } from "@/lib/accounting";

registerPage({
  id: "accounting.journal-entries.list",
  moduleSlug: "accounting",
  title: "Accounting — Journal Entries",
  path: "/partner/[partnerId]/accounting/journal-entries",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Lists every JournalEntry (Prisma-backed, double-entry balanced on create/edit — see src/lib/accounting.ts's validateJournalLines).",
  sourceFile: "src/app/partner/[partnerId]/accounting/journal-entries/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function JournalEntriesPage({ params }: { params: { partnerId: string } }) {
  const entries = await listJournalEntries(params.partnerId);

  return (
    <AppShell
      topbarTitle="Journal Entries"
      topbarActions={
        <Link href={`/partner/${params.partnerId}/accounting/journal-entries/new`} className="btn-accent">
          + New Entry
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">Every double-entry-balanced posting to the ledger.</p>

        <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-bg-raised">
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                <th className="px-3 py-2.5">Entry #</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Narration</th>
                <th className="px-3 py-2.5 text-right">Debit</th>
                <th className="px-3 py-2.5 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-text-muted">
                    No journal entries yet.
                  </td>
                </tr>
              )}
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2">
                    <Link href={`/partner/${params.partnerId}/accounting/journal-entries/${e.id}`} className="font-semibold text-teal hover:underline">
                      {e.entryNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-text-muted">{formatDate(e.entryDate.toISOString())}</td>
                  <td className="px-3 py-2 text-text">{e.narration ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR(e.totalDebit / 100)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-text">{formatCurrencyINR(e.totalCredit / 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
