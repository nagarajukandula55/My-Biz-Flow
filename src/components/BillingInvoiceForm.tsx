"use client";

import { useState, useTransition } from "react";
import { LineItemsEditor, computeTotals, type ItemOption } from "./LineItemsEditor";
import type { LineItem } from "@/lib/sample-data/billing";
import { formatCurrencyINR } from "@/lib/format";
import { INDIAN_STATES } from "@/lib/sample-data/geo";
import { SearchSelectModal, type SearchSelectOption } from "./SearchSelectModal";

export type ContactOption = {
  id: string;
  label: string;
  gstin?: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

export type InvoiceType = "GST" | "Non-GST";

/** A partner's own standing Customer directory (service-centre-customers module) — a second source of customer prefill alongside Billing Contacts, browsed via a search modal. */
export type CustomerOption = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
};

export type BillingInvoiceValues = {
  customer: string;
  /** Id of the Billing Contact this customer name was picked from, if any — see the Customer field below. Lets centralApi.ts look up the contact's actual state instead of guessing. */
  customerContactId?: string | null;
  invoiceType: InvoiceType;
  /** Explicit place-of-supply choice — see the Intrastate/Interstate toggle below. Defaults from the customer-vs-partner state comparison but, once the user clicks a toggle button, is the real value sent to the server (never silently re-derived). */
  supplyType?: "INTRASTATE" | "INTERSTATE";
  customerGstin: string;
  customerCompany: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerCity: string;
  customerState: string;
  customerPincode: string;
  issueDate: string;
  dueDate: string;
  discountAmount: number;
  notes: string;
  terms: string;
  paymentStatus: string;
  paymentMode: string;
  items: LineItem[];
};

const DEFAULT_ITEM: LineItem = { description: "", quantity: 1, unit: "pcs", unitPrice: 0, taxRate: 18, hsnCode: "" };

/** Normalizes "Karnataka" / "karnataka " so a place-of-supply comparison isn't defeated by casing/whitespace. */
function normalizeState(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}

/** Auto-detected default for the Intrastate/Interstate toggle — a customer in this partner's own state is intra-state; blank customer state falls back to intra-state, same default ServiceCentreInvoiceDocument.tsx uses. Only a *default*: the toggle below is the real, sticky, user-overridable value. */
function suggestSupplyType(customerSt?: string, partnerSt?: string | null): "INTRASTATE" | "INTERSTATE" {
  const inter =
    normalizeState(customerSt) !== "" &&
    normalizeState(partnerSt ?? "") !== "" &&
    normalizeState(customerSt) !== normalizeState(partnerSt ?? "");
  return inter ? "INTERSTATE" : "INTRASTATE";
}

/**
 * Billing's invoice creation/edit form — a deliberate exception to
 * RecordForm (see LineItemsEditor's docs for why): customer/date fields
 * plus a repeating, live-computed line-items table feeding the totals,
 * instead of typing subtotal/tax/total by hand as flat numbers.
 *
 * Laid out as a set of bordered cards (Invoice Type, Invoice Details,
 * Bill To, Line Items, Notes & Terms, Totals) — the same "sections as
 * bordered cards" shape RecordForm's own "columns" layout uses elsewhere
 * in this app (see RecordForm.tsx), rather than one long form. Collects a
 * full customer block (company/phone/email/address/city/state/pincode/
 * GSTIN) and per-line HSN codes so the printed tax invoice can show a real
 * Bill To and a correct B2B/B2C document type — same general shape as the
 * Service Centre Sales Invoice's own customer block. Place of supply
 * (Intrastate CGST+SGST vs Interstate IGST) starts from comparing the
 * customer's state against this partner's own registered state
 * (`partnerState`, passed in by the page) — the same comparison
 * ServiceCentreInvoiceDocument.tsx uses — but is a real manual toggle
 * (`supplyType` state), matching AN-CRM's real invoice-creation page: the
 * auto-detected value is only the default / re-suggestion whenever a new
 * customer/contact is picked, and once the user clicks a toggle button
 * directly it sticks — it is never silently recomputed back on a re-render.
 */
export function BillingInvoiceForm({
  initialValues,
  submitLabel,
  action,
  contactOptions,
  customerOptions,
  itemOptions,
  partnerState,
}: {
  initialValues?: Partial<BillingInvoiceValues>;
  submitLabel: string;
  /** Real persistence path — a bound server action receiving the full record (including computed totals). Omit for the demo-stub path. */
  action?: (values: Record<string, unknown>) => Promise<void>;
  /** Billing Contacts to pick a customer from (see billing-contacts.ts) — the field stays a free-text input with these as suggestions, so existing invoices with a plain name keep working. */
  contactOptions?: ContactOption[];
  /** This partner's own Customers (service-centre-customers module) — browsed via the "Browse Customers" modal, a second explicit source of customer prefill alongside the Billing Contacts datalist above. */
  customerOptions?: CustomerOption[];
  /** Billing Items catalog for the line-items "pick from catalog" autofill. */
  itemOptions?: ItemOption[];
  /** This partner's own registered state (Partner.state) — the place of
   * supply the customer's state is compared against to decide the
   * CGST+SGST vs IGST split. Undefined disables the split (falls back to
   * intra-state), same default ServiceCentreInvoiceDocument.tsx uses when
   * a state is missing. */
  partnerState?: string | null;
}) {
  const [customer, setCustomer] = useState(initialValues?.customer ?? "");
  const [customerContactId, setCustomerContactId] = useState<string | null>(
    initialValues?.customerContactId ?? null
  );
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(initialValues?.invoiceType ?? "GST");
  const [customerGstin, setCustomerGstin] = useState(initialValues?.customerGstin ?? "");
  const [customerCompany, setCustomerCompany] = useState(initialValues?.customerCompany ?? "");
  const [customerPhone, setCustomerPhone] = useState(initialValues?.customerPhone ?? "");
  const [customerEmail, setCustomerEmail] = useState(initialValues?.customerEmail ?? "");
  const [customerAddress, setCustomerAddress] = useState(initialValues?.customerAddress ?? "");
  const [customerCity, setCustomerCity] = useState(initialValues?.customerCity ?? "");
  const [customerState, setCustomerState] = useState(initialValues?.customerState ?? "");
  const [customerPincode, setCustomerPincode] = useState(initialValues?.customerPincode ?? "");
  // Place of supply: a real manual toggle (Intrastate/Interstate), not just
  // auto-detection. Initialized from the auto-detected comparison (or a
  // persisted explicit value on edit) and re-suggested whenever a new
  // customer/contact is picked — but only until the user clicks a toggle
  // button directly, after which `supplyTypeManual` keeps the pick from
  // being silently overwritten by a later customer pick or re-render.
  const [supplyType, setSupplyType] = useState<"INTRASTATE" | "INTERSTATE">(
    initialValues?.supplyType ?? suggestSupplyType(initialValues?.customerState, partnerState)
  );
  const [supplyTypeManual, setSupplyTypeManual] = useState(Boolean(initialValues?.supplyType));
  const [browseCustomersOpen, setBrowseCustomersOpen] = useState(false);
  const [issueDate, setIssueDate] = useState(initialValues?.issueDate ?? "");
  const [dueDate, setDueDate] = useState(initialValues?.dueDate ?? "");
  const [discountAmount, setDiscountAmount] = useState(initialValues?.discountAmount ?? 0);
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [terms, setTerms] = useState(initialValues?.terms ?? "Payment due within 30 days.");
  const [paymentStatus, setPaymentStatus] = useState(initialValues?.paymentStatus ?? "Draft");
  const [paymentMode, setPaymentMode] = useState(initialValues?.paymentMode ?? "Bank Transfer");
  const [items, setItems] = useState<LineItem[]>(initialValues?.items ?? [{ ...DEFAULT_ITEM }]);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const showTax = invoiceType === "GST";
  const totals = computeTotals(items, showTax);

  // The manual toggle (supplyType state, above) is the real value — CGST+SGST
  // for INTRASTATE, IGST for INTERSTATE. It is not recomputed here.
  const interState = supplyType === "INTERSTATE";
  const igstTotal = showTax && interState ? totals.taxTotal : 0;
  const cgstTotal = showTax && !interState ? totals.taxTotal / 2 : 0;
  const sgstTotal = showTax && !interState ? totals.taxTotal / 2 : 0;
  const grandTotal = totals.grandTotal - (discountAmount || 0);

  function handleInvoiceTypeChange(next: InvoiceType) {
    setInvoiceType(next);
    // A Non-GST invoice never carries a tax rate — zero out any items
    // that were entered while GST was selected, rather than just hiding
    // a nonzero rate from the UI.
    if (next === "Non-GST") {
      setItems((prev) => prev.map((it) => ({ ...it, taxRate: 0 })));
    }
  }

  function applyContact(c: ContactOption) {
    setCustomer(c.label);
    setCustomerContactId(c.id);
    setCustomerGstin(c.gstin ?? "");
    setCustomerCompany(c.company ?? "");
    setCustomerPhone(c.phone ?? "");
    setCustomerEmail(c.email ?? "");
    setCustomerAddress(c.address ?? "");
    setCustomerCity(c.city ?? "");
    setCustomerState(c.state ?? "");
    setCustomerPincode(c.pincode ?? "");
    if (!supplyTypeManual) setSupplyType(suggestSupplyType(c.state, partnerState));
  }

  /** Prefill from a picked Customer (service-centre-customers module) — a second, additional source of customer prefill alongside applyContact() above. Not linked to a Billing Contact id, so it clears customerContactId. */
  function applyCustomer(c: CustomerOption) {
    setCustomer(c.name);
    setCustomerContactId(null);
    setCustomerGstin(c.gstin ?? "");
    setCustomerCompany("");
    setCustomerPhone(c.phone ?? "");
    setCustomerEmail(c.email ?? "");
    setCustomerAddress(c.address ?? "");
    setCustomerCity(c.city ?? "");
    setCustomerState(c.state ?? "");
    setCustomerPincode(c.pincode ?? "");
    if (!supplyTypeManual) setSupplyType(suggestSupplyType(c.state, partnerState));
  }

  function handleSupplyTypeChange(next: "INTRASTATE" | "INTERSTATE") {
    setSupplyType(next);
    setSupplyTypeManual(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const values: BillingInvoiceValues = {
      customer,
      customerContactId,
      invoiceType,
      supplyType,
      customerGstin,
      customerCompany,
      customerPhone,
      customerEmail,
      customerAddress,
      customerCity,
      customerState,
      customerPincode,
      issueDate,
      dueDate,
      discountAmount,
      notes,
      terms,
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
          supplyType: showTax ? supplyType : undefined,
          cgstAmount: cgstTotal,
          sgstAmount: sgstTotal,
          igstAmount: igstTotal,
          totalAmount: grandTotal,
        });
      });
      return;
    }
    // eslint-disable-next-line no-console
    console.log("BillingInvoiceForm submit (demo, no backend):", values, totals);
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl space-y-5">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-bg-raised p-4">
          <h2 className="mb-3 font-display text-sm font-bold text-text">Invoice Type</h2>
          <div className="flex gap-2 rounded-md border border-border bg-bg p-1">
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
          {showTax && (
            <div className="mt-3">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">Place of Supply</div>
              <div className="flex gap-2 rounded-md border border-border bg-bg p-1">
                {(
                  [
                    { key: "INTRASTATE", label: "Intrastate (CGST + SGST)" },
                    { key: "INTERSTATE", label: "Interstate (IGST)" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleSupplyTypeChange(opt.key)}
                    className={`flex-1 rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
                      supplyType === opt.key ? "bg-accent text-white" : "text-text-muted hover:text-text"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-text-muted">
                {supplyTypeManual
                  ? "Manually set — won't change automatically when the customer's state changes."
                  : customerState
                  ? `Auto-detected from customer in ${customerState}${partnerState ? `, business in ${partnerState}` : ""} — click a button above to override.`
                  : "Defaults to Intrastate until the customer's state is set below — click a button above to override."}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-md border border-border bg-bg-raised p-4">
          <h2 className="mb-3 font-display text-sm font-bold text-text">Invoice Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        </div>
      </div>

      <div className="rounded-md border border-border bg-bg-raised p-4">
        <h2 className="mb-3 font-display text-sm font-bold text-text">Bill To</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Customer" required>
            <div className="flex gap-2">
              <input
                value={customer}
                onChange={(e) => {
                  setCustomer(e.target.value);
                  // The field stays free-text (see the contactOptions doc below), so a
                  // linked contact only exists when the typed value exactly matches a
                  // suggestion's label. Any further edit — including picking a
                  // different suggestion — re-evaluates this and drops the link if it
                  // no longer matches, so a free-typed name never carries a stale id.
                  const match = contactOptions?.find((c) => c.label === e.target.value);
                  if (match) applyContact(match);
                  else setCustomerContactId(null);
                }}
                placeholder="Customer or partner name"
                required
                list={contactOptions ? "billing-contact-options" : undefined}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
              />
              {customerOptions && customerOptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setBrowseCustomersOpen(true)}
                  className="shrink-0 whitespace-nowrap rounded-md border border-border bg-bg px-3 py-2 text-sm font-medium text-text hover:bg-bg-sunken"
                >
                  Browse Customers
                </button>
              )}
            </div>
            {contactOptions && (
              <datalist id="billing-contact-options">
                {contactOptions.map((c) => (
                  <option key={c.id} value={c.label} />
                ))}
              </datalist>
            )}
            {customerContactId && (
              <p className="mt-1 text-[11px] text-success">Existing contact — details prefilled from directory.</p>
            )}
          </Field>
          <Field label="Company">
            <input
              value={customerCompany}
              onChange={(e) => setCustomerCompany(e.target.value)}
              placeholder="Acme Pvt Ltd"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            />
          </Field>
          <Field label="Phone">
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="billing@acme.com"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            />
          </Field>
          {showTax && (
            <Field label="Customer GSTIN">
              <input
                value={customerGstin}
                onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                maxLength={15}
                placeholder="22AAAAA0000A1Z5"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text font-mono outline-none focus:border-teal"
              />
            </Field>
          )}
          <Field label="Billing Address">
            <input
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="Street"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            />
          </Field>
          <Field label="City">
            <input
              value={customerCity}
              onChange={(e) => setCustomerCity(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            />
          </Field>
          <Field label="State">
            <select
              value={customerState}
              onChange={(e) => {
                setCustomerState(e.target.value);
                if (!supplyTypeManual) setSupplyType(suggestSupplyType(e.target.value, partnerState));
              }}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            >
              <option value="">Select a state</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pincode">
            <input
              value={customerPincode}
              onChange={(e) => setCustomerPincode(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text font-mono outline-none focus:border-teal"
            />
          </Field>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Line Items
        </div>
        <LineItemsEditor items={items} onChange={setItems} showTax={showTax} showHsn={showTax} itemOptions={itemOptions} />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-bg-raised p-4 space-y-4">
          <div>
            <h2 className="mb-1.5 font-display text-sm font-bold text-text">Notes</h2>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes for this invoice"
              className="w-full resize-none rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            />
          </div>
          <div>
            <h2 className="mb-1.5 font-display text-sm font-bold text-text">Terms &amp; Conditions</h2>
            <textarea
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full resize-none rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            />
          </div>
        </div>

        <div className="rounded-md border border-border bg-bg-raised p-4">
          <h2 className="mb-3 font-display text-sm font-bold text-text">Totals</h2>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-text-muted">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums text-text">{formatCurrencyINR(totals.subtotal)}</span>
            </div>
            {showTax && !interState && (
              <>
                <div className="flex justify-between text-text-muted">
                  <span>CGST</span>
                  <span className="font-mono tabular-nums text-text">{formatCurrencyINR(cgstTotal)}</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>SGST</span>
                  <span className="font-mono tabular-nums text-text">{formatCurrencyINR(sgstTotal)}</span>
                </div>
              </>
            )}
            {showTax && interState && (
              <div className="flex justify-between text-text-muted">
                <span>IGST</span>
                <span className="font-mono tabular-nums text-text">{formatCurrencyINR(igstTotal)}</span>
              </div>
            )}
            <Field label="Discount">
              <input
                type="number"
                min={0}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text font-mono outline-none focus:border-teal"
              />
            </Field>
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold text-text">
              <span>Grand Total</span>
              <span className="font-mono tabular-nums">{formatCurrencyINR(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-accent" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {saved && !action && (
          <span className="text-sm font-semibold text-success">Saved (demo — no backend yet)</span>
        )}
      </div>

      {customerOptions && (
        <SearchSelectModal
          open={browseCustomersOpen}
          onClose={() => setBrowseCustomersOpen(false)}
          title="Browse Customers"
          searchPlaceholder="Search by name or phone…"
          options={customerOptions.map<SearchSelectOption>((c) => ({
            value: c.id,
            label: c.name,
            sublabel: [c.phone, c.city].filter(Boolean).join(" · ") || undefined,
          }))}
          onSelect={(opt) => {
            const picked = customerOptions.find((c) => c.id === opt.value);
            if (picked) applyCustomer(picked);
          }}
        />
      )}
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
