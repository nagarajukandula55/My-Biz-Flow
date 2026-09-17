"use client";

import { useState, useTransition } from "react";
import { LineItemsEditor, computeTotals, type ItemOption } from "./LineItemsEditor";
import type { LineItem } from "@/lib/sample-data/billing";
import {
  SALES_DOC_STATUSES,
  CHALLAN_PURPOSES,
  type SalesDocKind,
} from "@/lib/sample-data/billing-sales-documents";
import type { ContactOption } from "./BillingInvoiceForm";

export type SalesDocumentValues = {
  contact: string;
  issueDate: string;
  validUntil: string;
  purpose: string;
  vehicleNumber: string;
  dispatchAddress: string;
  status: string;
  notes: string;
  items: LineItem[];
};

const DEFAULT_ITEM: LineItem = { description: "", quantity: 1, unit: "pcs", unitPrice: 0, taxRate: 18 };

/**
 * One create/edit form shared by Quotations, Delivery Challans and
 * Proforma Invoices — the same contact + line-items + computed-totals
 * shape BillingInvoiceForm/CreditNoteForm use, with the two or three
 * header fields that actually differ per doc type switched on `docKind`
 * (AN-CRM does the same with one SalesDocumentManager across five types).
 */
export function SalesDocumentForm({
  docKind,
  docLabel,
  initialValues,
  submitLabel,
  action,
  contactOptions,
  itemOptions,
}: {
  docKind: SalesDocKind;
  docLabel: string;
  initialValues?: Partial<SalesDocumentValues>;
  submitLabel: string;
  action?: (values: Record<string, unknown>) => Promise<void>;
  contactOptions?: ContactOption[];
  itemOptions?: ItemOption[];
}) {
  const [contact, setContact] = useState(initialValues?.contact ?? "");
  const [issueDate, setIssueDate] = useState(initialValues?.issueDate ?? "");
  const [validUntil, setValidUntil] = useState(initialValues?.validUntil ?? "");
  const [purpose, setPurpose] = useState(initialValues?.purpose ?? CHALLAN_PURPOSES[0]);
  const [vehicleNumber, setVehicleNumber] = useState(initialValues?.vehicleNumber ?? "");
  const [dispatchAddress, setDispatchAddress] = useState(initialValues?.dispatchAddress ?? "");
  const [status, setStatus] = useState(initialValues?.status ?? SALES_DOC_STATUSES[0]);
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [items, setItems] = useState<LineItem[]>(initialValues?.items ?? [{ ...DEFAULT_ITEM }]);
  const [pending, startTransition] = useTransition();

  const isChallan = docKind === "delivery-challan";
  const totals = computeTotals(items, true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!action) return;
    const values: Record<string, unknown> = {
      contact,
      issueDate,
      status,
      notes,
      items,
      lineItemsSummary: items.map((it) => it.description).filter(Boolean).join("; "),
      subtotal: totals.subtotal,
      taxAmount: totals.taxTotal,
      totalAmount: totals.grandTotal,
    };
    if (isChallan) {
      values.purpose = purpose;
      values.vehicleNumber = vehicleNumber;
      values.dispatchAddress = dispatchAddress;
    } else {
      values.validUntil = validUntil;
    }
    startTransition(async () => {
      await action(values);
    });
  }

  const listId = `${docKind}-contact-options`;

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Contact" required>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Customer or partner name"
            required
            list={contactOptions ? listId : undefined}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
          />
          {contactOptions && (
            <datalist id={listId}>
              {contactOptions.map((c) => (
                <option key={c.id} value={c.label} />
              ))}
            </datalist>
          )}
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

        {isChallan ? (
          <>
            <Field label="Purpose" required>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
              >
                {CHALLAN_PURPOSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Vehicle Number">
              <input
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="KA 01 AB 1234"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text font-mono outline-none focus:border-teal"
              />
            </Field>
            <Field label="Dispatch Address">
              <input
                value={dispatchAddress}
                onChange={(e) => setDispatchAddress(e.target.value)}
                placeholder="Where the goods are being shipped to"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
              />
            </Field>
          </>
        ) : (
          <Field label="Valid Until">
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text font-mono outline-none focus:border-teal"
            />
          </Field>
        )}

        <Field label="Status" required>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
          >
            {SALES_DOC_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Notes">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Terms, remarks, delivery conditions…"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
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
        <span className="text-xs text-text-muted">{docLabel}</span>
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
