"use client";

import { useState, useTransition } from "react";
import { LineItemsEditor, computeTotals, type ItemOption } from "./LineItemsEditor";
import type { LineItem } from "@/lib/sample-data/billing";
import { NOTE_TYPES, NOTE_REASONS } from "@/lib/sample-data/billing-credit-notes";
import type { ContactOption } from "./BillingInvoiceForm";
import { InlineTypeahead } from "./InlineTypeahead";

export type NoteType = (typeof NOTE_TYPES)[number];

export type CreditNoteValues = {
  noteType: NoteType;
  contact: string;
  linkedInvoiceId: string;
  reason: string;
  issueDate: string;
  items: LineItem[];
};

const DEFAULT_ITEM: LineItem = { description: "", quantity: 1, unit: "pcs", unitPrice: 0, taxRate: 18 };

/**
 * Credit Note / Debit Note creation-edit form — mirrors BillingInvoiceForm's
 * shape (contact + line items feeding computed totals via LineItemsEditor)
 * but swaps payment fields for note type/reason/linked-invoice, since a
 * note adjusts a contact's balance rather than billing them.
 */
export function CreditNoteForm({
  initialValues,
  submitLabel,
  action,
  contactOptions,
  itemOptions,
  invoiceOptions,
}: {
  initialValues?: Partial<CreditNoteValues>;
  submitLabel: string;
  action?: (values: Record<string, unknown>) => Promise<void>;
  contactOptions?: ContactOption[];
  itemOptions?: ItemOption[];
  invoiceOptions?: string[];
}) {
  const [noteType, setNoteType] = useState<NoteType>(initialValues?.noteType ?? "Credit Note");
  const [contact, setContact] = useState(initialValues?.contact ?? "");
  const [linkedInvoiceId, setLinkedInvoiceId] = useState(initialValues?.linkedInvoiceId ?? "");
  const [reason, setReason] = useState(initialValues?.reason ?? NOTE_REASONS[0]);
  const [issueDate, setIssueDate] = useState(initialValues?.issueDate ?? "");
  const [items, setItems] = useState<LineItem[]>(initialValues?.items ?? [{ ...DEFAULT_ITEM }]);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const totals = computeTotals(items, true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const values: CreditNoteValues = { noteType, contact, linkedInvoiceId, reason, issueDate, items };
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
    console.log("CreditNoteForm submit (demo, no backend):", values, totals);
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl">
      <div className="mb-5 flex gap-2 rounded-md border border-border bg-bg-raised p-1">
        {NOTE_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setNoteType(type)}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
              noteType === type ? "bg-accent text-accent-contrast" : "text-text-muted hover:text-text"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Contact" required>
          <InlineTypeahead
            value={contact}
            onChange={setContact}
            placeholder="Customer or partner name"
            options={(contactOptions ?? []).map((c) => ({ value: c.id, label: c.label }))}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
          />
        </Field>
        <Field label="Against Invoice (optional)">
          <InlineTypeahead
            value={linkedInvoiceId}
            onChange={setLinkedInvoiceId}
            placeholder="INV-3301"
            options={(invoiceOptions ?? []).map((id) => ({ value: id, label: id }))}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text font-mono outline-none focus:border-teal"
          />
        </Field>
        <Field label="Reason" required>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
          >
            {NOTE_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
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
      </div>

      <div className="mt-6">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Line Items</div>
        <LineItemsEditor items={items} onChange={setItems} showTax itemOptions={itemOptions} />
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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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
