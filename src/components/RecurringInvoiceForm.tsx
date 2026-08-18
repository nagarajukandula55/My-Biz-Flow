"use client";

import { useState, useTransition } from "react";
import { LineItemsEditor, computeTotals, type ItemOption } from "./LineItemsEditor";
import type { LineItem } from "@/lib/sample-data/billing";
import { RECURRING_FREQUENCIES, type RecurringFrequency } from "@/lib/sample-data/billing-recurring";
import type { ContactOption } from "./BillingInvoiceForm";

export type RecurringInvoiceValues = {
  customer: string;
  frequency: RecurringFrequency;
  startDate: string;
  nextRunDate: string;
  status: "Active" | "Paused";
  items: LineItem[];
};

const DEFAULT_ITEM: LineItem = { description: "", quantity: 1, unit: "pcs", unitPrice: 0, taxRate: 18 };

/**
 * Recurring Invoice template form — same line-items shape as
 * BillingInvoiceForm, but captures a frequency + next-run-date instead of
 * payment fields, since this record is a template the cron route
 * (api/cron/billing-recurring-invoices) reads, not a billable document
 * itself.
 */
export function RecurringInvoiceForm({
  initialValues,
  submitLabel,
  action,
  contactOptions,
  itemOptions,
}: {
  initialValues?: Partial<RecurringInvoiceValues>;
  submitLabel: string;
  action?: (values: Record<string, unknown>) => Promise<void>;
  contactOptions?: ContactOption[];
  itemOptions?: ItemOption[];
}) {
  const [customer, setCustomer] = useState(initialValues?.customer ?? "");
  const [frequency, setFrequency] = useState<RecurringFrequency>(initialValues?.frequency ?? "Monthly");
  const [startDate, setStartDate] = useState(initialValues?.startDate ?? "");
  const [nextRunDate, setNextRunDate] = useState(initialValues?.nextRunDate ?? "");
  const [status, setStatus] = useState<"Active" | "Paused">(initialValues?.status ?? "Active");
  const [items, setItems] = useState<LineItem[]>(initialValues?.items ?? [{ ...DEFAULT_ITEM }]);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const totals = computeTotals(items, true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const values: RecurringInvoiceValues = { customer, frequency, startDate, nextRunDate, status, items };
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
    console.log("RecurringInvoiceForm submit (demo, no backend):", values, totals);
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Customer" required>
          <input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="Customer or partner name"
            required
            list={contactOptions ? "recurring-contact-options" : undefined}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
          />
          {contactOptions && (
            <datalist id="recurring-contact-options">
              {contactOptions.map((c) => (
                <option key={c.id} value={c.label} />
              ))}
            </datalist>
          )}
        </Field>
        <Field label="Frequency" required>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
          >
            {RECURRING_FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Start Date" required>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (!nextRunDate) setNextRunDate(e.target.value);
            }}
            required
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text font-mono outline-none focus:border-teal"
          />
        </Field>
        <Field label="Next Run Date" required>
          <input
            type="date"
            value={nextRunDate}
            onChange={(e) => setNextRunDate(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text font-mono outline-none focus:border-teal"
          />
        </Field>
        <Field label="Status" required>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "Active" | "Paused")}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
          >
            {(["Active", "Paused"] as const).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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
