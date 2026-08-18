import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { formatCurrencyINR } from "@/lib/format";

registerPage({
  id: "billing.reports.contact-statement.detail",
  moduleSlug: "billing",
  title: "Billing — Reports — Contact Statement",
  path: "/vendor/[vendorId]/billing/reports/contact-statement/[contactId]",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "One contact's chronological ledger — invoices (charges), credit/debit notes and payments (credits) — with a running balance, computed in-memory by matching each record's contact/customer name against this Contact.",
  sourceFile: "src/app/vendor/[vendorId]/billing/reports/contact-statement/[contactId]/page.tsx",
});

export const dynamic = "force-dynamic";

type LedgerEntry = { date: string; type: string; ref: string; charge: number; credit: number };

export default async function ContactStatementPage({
  params,
}: {
  params: { vendorId: string; contactId: string };
}) {
  const contact = await getBusinessRecord(params.vendorId, "billing-contacts", params.contactId);
  if (!contact) notFound();
  const contactName = String(contact["name"] ?? contact["id"]);

  const [invoices, notes, payments] = await Promise.all([
    listBusinessRecords(params.vendorId, "billing"),
    listBusinessRecords(params.vendorId, "billing-credit-notes"),
    listBusinessRecords(params.vendorId, "billing-payments"),
  ]);

  const entries: LedgerEntry[] = [];

  for (const inv of invoices.filter((r) => r["customer"] === contactName)) {
    entries.push({
      date: String(inv["issueDate"] ?? ""),
      type: "Invoice",
      ref: String(inv["id"]),
      charge: Number(inv["totalAmount"]) || 0,
      credit: 0,
    });
  }
  for (const note of notes.filter((r) => r["contact"] === contactName)) {
    const amount = Number(note["totalAmount"]) || 0;
    const isCredit = note["noteType"] === "Credit Note";
    entries.push({
      date: String(note["issueDate"] ?? ""),
      type: String(note["noteType"] ?? "Note"),
      ref: String(note["id"]),
      charge: isCredit ? 0 : amount,
      credit: isCredit ? amount : 0,
    });
  }
  for (const pay of payments.filter((r) => r["contact"] === contactName)) {
    entries.push({
      date: String(pay["date"] ?? ""),
      type: "Payment",
      ref: String(pay["id"]),
      charge: 0,
      credit: Number(pay["amount"]) || 0,
    });
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));

  let running = 0;
  const rows = entries.map((e) => {
    running += e.charge - e.credit;
    return { ...e, balance: running };
  });

  return (
    <AppShell topbarTitle={`Statement — ${contactName}`}>
      <div>
        <p className="text-sm text-text-muted">
          Closing balance: <span className="font-mono font-semibold text-text">{formatCurrencyINR(running)}</span>
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-bg-raised">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Reference</th>
                <th className="px-3 py-2.5 text-right">Charge</th>
                <th className="px-3 py-2.5 text-right">Credit</th>
                <th className="px-3 py-2.5 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-text-muted">
                    No activity for this contact yet.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2 text-text-muted">{r.date}</td>
                  <td className="px-3 py-2 text-text">{r.type}</td>
                  <td className="px-3 py-2 text-text">{r.ref}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{r.charge ? formatCurrencyINR(r.charge) : "—"}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{r.credit ? formatCurrencyINR(r.credit) : "—"}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums text-text">{formatCurrencyINR(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Link href={`/vendor/${params.vendorId}/billing/reports/contact-statement`} className="btn-outline">
            &larr; Back to contacts
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
