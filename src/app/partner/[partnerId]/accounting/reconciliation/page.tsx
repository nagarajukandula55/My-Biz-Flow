import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { LinkedRecordTable } from "@/components/LinkedRecordTable";
import { RecordForm } from "@/components/RecordForm";
import { registerPage } from "@/lib/designer/registry";
import { billingReconciliation } from "@/lib/billingReconciliation";
import { billingDocumentKind } from "@/lib/billingReconciliationRules";
import { formatCurrencyINR } from "@/lib/format";
import { linkInvoiceAction } from "./actions";
import { hasActiveAccessKey } from "@/lib/designer/accessKeys";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";

registerPage({ id: "accounting.reconciliation", moduleSlug: "accounting", title: "Accounting — Billing reconciliation", path: "/partner/[partnerId]/accounting/reconciliation", kind: "list", superAdminOnly: false, customizableRegions: [], explanation: "Owner review of invoice totals against linked ledger revenue, tax liability and asset balances. Requires Accounting and Billing. Paginates fifty invoices and never changes an invoice or creates a posting automatically.", sourceFile: "src/app/partner/[partnerId]/accounting/reconciliation/page.tsx" });
export const dynamic = "force-dynamic";
export default async function ReconciliationPage({ params, searchParams }: { params: { partnerId: string }; searchParams?: { after?: string; kind?: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  if (!await hasActiveAccessKey(params.partnerId, "billing")) return <AppShell topbarTitle="Billing reconciliation"><p className="text-sm text-text-muted">Enable Billing alongside Accounting to reconcile invoice amounts with the ledger.</p></AppShell>;
  const kind = billingDocumentKind(searchParams?.kind ?? "billing");
  const result = await billingReconciliation(params.partnerId, searchParams?.after, kind);
  const base = `/partner/${params.partnerId}/accounting`;
  const documentPath = kind === "billing" ? "billing" : kind === "billing-credit-notes" ? "billing/credit-notes" : "billing/payments";
  return <AppShell topbarTitle="Billing reconciliation">
    <h1 className="font-display text-2xl font-bold text-text">Billing reconciliation</h1>
    <p className="my-3 text-sm text-text-muted">Invoices and debit notes debit receivables and credit income and tax liabilities. Credit notes reverse those allocations. Payments debit a receipt asset account and credit a different receivable asset account. Discount and rounding are included in net income. These checks compare recorded amounts and dates; they do not verify bank receipts, certify GST rates or file returns.</p>
    <nav aria-label="Document types" className="my-4 flex flex-wrap gap-3">{[["billing", "Invoices"], ["billing-credit-notes", "Credit / debit notes"], ["billing-payments", "Payments"]].map(([value, label]) => <Link key={value} className="btn-outline" aria-current={kind === value ? "page" : undefined} href={`${base}/reconciliation?kind=${value}`}>{label}</Link>)}</nav>
    <div className="my-4 flex flex-wrap gap-3"><Link className="btn-outline" href={`${base}/journal-entries/new`}>Create journal entry</Link><Link className="btn-outline" href={`${base}/journal-entries`}>Review journal entries</Link></div>
    <LinkedRecordTable columns={[{ key: "id", label: "Document", type: "text" }, { key: "total", label: "Total", type: "text" }, { key: "tax", label: "Tax", type: "text" }, { key: "journal", label: "Linked journal", type: "text" }, { key: "status", label: "Review result", type: "text" }]} rows={result.rows.map(row => ({ ...row, total: row.total === null ? "Invalid" : formatCurrencyINR(row.total / 100), tax: row.tax === null ? "Invalid" : formatCurrencyINR(row.tax / 100), href: `/partner/${params.partnerId}/${documentPath}/${encodeURIComponent(row.id)}` }))} />
    <div className="my-4 flex flex-wrap gap-3">{searchParams?.after && <Link className="btn-outline" href={`${base}/reconciliation?kind=${kind}`}>First page</Link>}{result.next && <Link className="btn-outline" href={`${base}/reconciliation?kind=${kind}&after=${encodeURIComponent(result.next)}`}>Next 50 documents</Link>}</div>
    <section className="my-8" aria-label="Link reviewed sales journal">
      <h2 className="font-display text-xl font-bold text-text">Link a reviewed journal</h2>
      <p className="my-3 text-sm text-text-muted">Enter the exact document and journal numbers. Notes and payments must reference an invoice belonging to this business. The server checks ownership, dates and amounts before linking. Subsequent edits and reversals are checked again in this report.</p>
      <RecordForm key={kind} fields={[{ key: "documentKind", label: "Document type", type: "select", required: true, options: ["billing", "billing-credit-notes", "billing-payments"], optionLabels: { billing: "Invoice", "billing-credit-notes": "Credit / debit note", "billing-payments": "Payment" } }, { key: "invoiceNumber", label: "Document number", type: "text", required: true }, { key: "journalNumber", label: "Journal entry number", type: "text", required: true }]} initialValues={{ documentKind: kind }} submitLabel="Check and link journal" action={linkInvoiceAction.bind(null, params.partnerId)} />
    </section>
  </AppShell>;
}
