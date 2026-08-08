"use client";

import { useState, useTransition } from "react";
import { LineItemsEditor, computeTotals } from "./LineItemsEditor";
import type { LineItem } from "@/lib/sample-data/billing";

export type InvoiceType = "GST" | "Non-GST";

export type BillingInvoiceValues = {
  customer: string;
  invoiceType: InvoiceType;
  customerGstin: string;
  issueDate: string;
  dueDate: string;
  paymentStatus: string;
  paymentMode: string;
  items: LineItem[];
};

const DEFAULT_ITEM: LineItem = { description: "", quantity: 1, unit: "pcs", unitPrice: 0, taxRate: 18 };

/**
 * Billing's invoice creation/edit form — a deliberate exception to
 * RecordForm (see LineItemsEditor's docs for why): customer/date fields
 * plus a repeating, live-computed line-items table feeding the totals,
 * instead of typing subtotal/tax/total by hand as flat numbers.
 */
export function BillingInvoiceForm({
  initialValues,
  submitLabel,
  action,
}: {
  initialValues?: Partial<BillingInvoiceValues>;
  submitLabel: string;
  /** Real persistence path — a bound server action receiving the full record (including computed totals). Omit for the demo-stub path. */
  action?: (values: Record<string, unknown>) => Promise<void>;
}) {
  const [customer, setCustomer] = useState(initialValues?.customer ?? "");
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(initialValues?.invoiceType ?? "GST");
  const [customerGstin, setCustomerGstin] = useState(initialValues?.customerGstin ?? "");
  const [issueDate, setIssueDate] = useState(initialValues?.issueDate ?? "");
  const [dueDate, setDueDate] = useState(initialValues?.dueDate ?? "");
  const [paymentStatus, setPaymentStatus] = useState(initialValues?.paymentStatus ?? "Draft");
  const [paymentMode, setPaymentMode] = useState(initialValues?.paymentMode ?? "Bank Transfer");
  const [items, setItems] = useState<LineItem[]>(initialValues?.items ?? [{ ...DEFAULT_ITEM }]);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const showTax = invoiceType === "GST";
  const totals = computeTotals(items, showTax);

  function handleInvoiceTypeChange(next: InvoiceType) {
    setInvoiceType(next);
    // A Non-GST invoice never carries a tax rate — zero out any items
    // that were entered while GST was selected, rather than just hiding
    // a nonzero rate from the UI.
    if (next === "Non-GST") {
      setItems((prev) => prev.map((it) => ({ ...it, taxRate: 0 })));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const values: BillingInvoiceValues = {
      customer,
      invoiceType,
      customerGstin,
      issueDate,
      dueDate,
      paymentStatus,
      paymentMode,
      items,
    };
    if (action) {
      startTransition(async () => {
        await action({
          ...values,
          lineItemsSummary: items.map((it) => it.description).filter(Boolean).join("; "),
          subtotal: totals.subtotal,
          taxAmount: totals.taxTotal,
          totalAmount: totals.grandTotal,
        });
      });
      return;
    }
    // eslint-disable-next-line no-console
    console.log("BillingInvoiceForm submit (demo, no backend):", values, totals);
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl">
      <div className="mb-5 flex gap-2 rounded-md border border-border bg-bg-raised p-1">
        {(["GST", "Non-GST"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => handleInvoiceTypeChange(type)}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
              invoiceType === type ? "bg-accent text-white" : "text-text-muted hover:text-text"
            }`}
          >
            {type} Invoice
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Customer" required>
          <input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="Customer or partner name"
            required
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
          />
        </Field>
        {invoiceType === "GST" && (
          <Field label="Customer GSTIN">
            <input
              value={customerGstin}
              onChange={(e) => setCustomerGstin(e.target.value)}
              placeholder="22AAAAA0000A1Z5"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text font-mono outline-none focus:border-teal"
            />
          </Field>
        )}
        <Field label="Payment Status" required>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
          >
            {["Draft", "Sent", "Paid", "Overdue", "Partially Paid"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Issue Date" required>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text font-mono outline-none focus:border-teal"
          />
        </Field>
        <Field label="Due Date" required>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text font-mono outline-none focus:border-teal"
          />
        </Field>
        <Field label="Payment Mode">
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
          >
            {["Bank Transfer", "UPI", "Cheque", "Cash", "Card"].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-6">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Line Items
        </div>
        <LineItemsEditor items={items} onChange={setItems} showTax={showTax} />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button type="submit" className="btn-accent" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {saved && !action && (
          <span className="text-sm font-semibold text-success">Saved (demo — no backend yet)</span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </span>
      {children}
    </label>
  );
}
