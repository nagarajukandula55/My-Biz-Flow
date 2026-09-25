"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { Landmark, QrCode, FileText, StickyNote, Plus, Check } from "lucide-react";
import { LineItemsEditor, computeTotals, type ItemOption } from "./LineItemsEditor";
import type { LineItem } from "@/lib/sample-data/billing";
import { formatCurrencyINR } from "@/lib/format";
import { INDIAN_STATES } from "@/lib/sample-data/geo";
import { SearchSelectModal, type SearchSelectOption } from "./SearchSelectModal";
import { InlineTypeahead } from "./InlineTypeahead";

/** This partner's own Bank Details (Partner.bankAccountName/bankName/bankAccountNumber/bankIfsc,
 * set from Settings → Bank Details) — passed in so the "On this Invoice" footer preview
 * below can show a real snippet instead of a blind toggle. */
export type PartnerBankDetails = {
  accountName?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifsc?: string | null;
};

/** Masks all but the last 4 digits of a bank account number for the footer preview tile — never print/preview the full number outside the actual document. */
function maskAccountNumber(num?: string | null): string {
  const v = (num ?? "").trim();
  if (!v) return "";
  if (v.length <= 4) return v;
  return `•••• ${v.slice(-4)}`;
}

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
  /** "On this Invoice" footer toggles — each defaults to true when the underlying
   * data exists (see BillingInvoiceForm's footer section) and is respected by
   * BillingInvoiceDocument.tsx: a block only prints when BOTH the toggle is on
   * AND the data actually exists, so a stale "on" from before data was cleared
   * never prints an empty/broken block. */
  showBankDetails?: boolean;
  showUpiQr?: boolean;
  showTerms?: boolean;
  showNotes?: boolean;
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
  partnerId,
  partnerBankDetails,
  partnerUpiId,
  partnerGstin,
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
  /** This partner's id — used only to build the "On this Invoice" footer's
   * jump-to-Settings link for a placeholder (not-yet-configured) tile. */
  partnerId?: string;
  /** This partner's own Bank Details (Settings → Bank Details) — drives the footer's Bank Details tile preview/placeholder. */
  partnerBankDetails?: PartnerBankDetails;
  /** This partner's own UPI VPA (Settings → Bank Details) — drives the footer's UPI Payment QR tile preview/placeholder. */
  partnerUpiId?: string | null;
  /** This partner's own registered GSTIN (Partner.gstin). A partner without
   * one is not GST-registered and cannot issue a GST-format tax invoice
   * (buyer GSTIN/HSN/CGST-SGST-IGST split) — only a plain/normal invoice.
   * Empty/undefined hides the "GST Invoice" option entirely and forces
   * Non-GST; the matching server-side reject lives in
   * businessRecordActions.ts (createBusinessRecordAction/
   * updateBusinessRecordAction) since hiding the UI control alone doesn't
   * stop a direct/crafted form submission. */
  partnerGstin?: string | null;
}) {
  const partnerHasGstin = Boolean(partnerGstin?.trim());
  const [customer, setCustomer] = useState(initialValues?.customer ?? "");
  const [customerContactId, setCustomerContactId] = useState<string | null>(
    initialValues?.customerContactId ?? null
  );
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(
    partnerHasGstin ? initialValues?.invoiceType ?? "GST" : "Non-GST"
  );
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
  // Same top-right sticky submit trigger as RecordForm (see RecordForm.tsx)
  // — a button outside the <form> DOM subtree still submits it via the
  // `form="<id>"` attribute, so "Create Invoice"/"Save" is visible right
  // away instead of after scrolling past Line Items/Totals/Footer.
  const formId = useId();

  // "On this Invoice" footer toggles — see BillingInvoiceValues' doc comment.
  // Configured-ness of Bank/UPI comes from Settings data passed in as props;
  // Terms/Notes are edited right here in this form, so their "configured"
  // check is just against the live textarea state below (declared after
  // notes/terms, see the memo-free booleans further down).
  const bankConfigured = Boolean(
    partnerBankDetails?.accountName || partnerBankDetails?.bankName || partnerBankDetails?.accountNumber || partnerBankDetails?.ifsc
  );
  const upiConfigured = Boolean(partnerUpiId?.trim());
  const [showBankDetails, setShowBankDetails] = useState(initialValues?.showBankDetails ?? bankConfigured);
  const [showUpiQr, setShowUpiQr] = useState(initialValues?.showUpiQr ?? upiConfigured);
  const [showTerms, setShowTerms] = useState(initialValues?.showTerms ?? true);
  const [showNotes, setShowNotes] = useState(initialValues?.showNotes ?? true);

  // "GST" vs "Non-GST" is a DOCUMENT FORMAT distinction (B2B tax invoice
  // vs B2C simplified bill), not a tax-on/tax-off switch — a Non-GST/B2C
  // sale still charges and must split GST correctly, it just doesn't
  // need the buyer's GSTIN. Previously showTax was invoiceType === "GST",
  // so every Non-GST invoice silently charged zero tax — a real reported
  // bug, fixed here. isB2B below gates only the GSTIN field, which a B2C
  // customer genuinely doesn't have.
  const showTax = true;
  // GSTIN/HSN/CGST-SGST-IGST are GST-registration-gated document fields —
  // a partner with no GSTIN of their own cannot issue a GST tax invoice, so
  // these never render for them regardless of the (forced-Non-GST) toggle.
  const showGstFields = showTax && partnerHasGstin;
  const isB2B = invoiceType === "GST";
  const totals = computeTotals(items, showTax);

  // The manual toggle (supplyType state, above) is the real value — CGST+SGST
  // for INTRASTATE, IGST for INTERSTATE. It is not recomputed here.
  const interState = supplyType === "INTERSTATE";
  const igstTotal = showGstFields && interState ? totals.taxTotal : 0;
  const cgstTotal = showGstFields && !interState ? totals.taxTotal / 2 : 0;
  const sgstTotal = showGstFields && !interState ? totals.taxTotal / 2 : 0;
  const grandTotal = totals.grandTotal - (discountAmount || 0);

  function handleInvoiceTypeChange(next: InvoiceType) {
    // GST vs Non-GST only changes the document format (B2B tax invoice vs
    // B2C simplified bill, i.e. whether a buyer GSTIN is collected) — tax
    // rates on existing lines are real, already-entered charges and must
    // not be wiped just because the invoice format toggle was clicked.
    // A partner with no GSTIN of their own can never switch into GST format
    // — fail closed here too, not just by hiding the button below.
    if (next === "GST" && !partnerHasGstin) return;
    setInvoiceType(next);
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
      showBankDetails,
      showUpiQr,
      showTerms,
      showNotes,
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
    <>
      <div className="sticky top-0 z-10 -mx-1 mb-4 flex items-center justify-end gap-3 bg-bg px-1 py-2">
        {saved && !action && (
          <span className="text-sm font-semibold text-success">Saved (demo — no backend yet)</span>
        )}
        <button type="submit" form={formId} className="btn-accent" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
      <form id={formId} onSubmit={handleSubmit} className="w-full space-y-5">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-bg-raised p-4">
          <h2 className="mb-3 font-display text-sm font-bold text-text">Invoice Type</h2>
          <div className="flex gap-2 rounded-md border border-border bg-bg p-1">
            {(partnerHasGstin ? (["GST", "Non-GST"] as const) : (["Non-GST"] as const)).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleInvoiceTypeChange(type)}
                className={`flex-1 rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
                  invoiceType === type ? "bg-accent text-accent-contrast" : "text-text-muted hover:text-text"
                }`}
              >
                {type} Invoice
              </button>
            ))}
          </div>
          {!partnerHasGstin && (
            <p className="mt-2 text-xs text-text-muted">
              This business has no registered GSTIN, so only a plain (Non-GST) invoice can be issued — no buyer
              GSTIN, HSN, or CGST/SGST/IGST fields.
            </p>
          )}
          {showGstFields && (
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
                      supplyType === opt.key ? "bg-accent text-accent-contrast" : "text-text-muted hover:text-text"
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Customer" required>
            <div className="flex gap-2">
              <InlineTypeahead
                value={customer}
                onChange={(v) => {
                  setCustomer(v);
                  // The field stays free-text (see the contactOptions doc below), so a
                  // linked contact only exists when the typed value exactly matches a
                  // suggestion's label. Any further edit — including picking a
                  // different suggestion — re-evaluates this and drops the link if it
                  // no longer matches, so a free-typed name never carries a stale id.
                  const match = contactOptions?.find((c) => c.label === v);
                  if (match) applyContact(match);
                  else setCustomerContactId(null);
                }}
                placeholder="Customer or partner name"
                options={(contactOptions ?? []).map((c) => ({ value: c.id, label: c.label }))}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
              />
              {customerOptions && (
                <button
                  type="button"
                  onClick={() => setBrowseCustomersOpen(true)}
                  className="shrink-0 whitespace-nowrap rounded-md border border-border bg-bg px-3 py-2 text-sm font-medium text-text hover:bg-bg-sunken"
                >
                  Browse Customers
                </button>
              )}
            </div>
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
          {isB2B && (
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
        <LineItemsEditor
          items={items}
          onChange={setItems}
          showTax={showTax}
          showHsn={showGstFields}
          itemOptions={itemOptions}
          interState={interState}
        />
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
            {showGstFields && !interState && (
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
            {showGstFields && interState && (
              <div className="flex justify-between text-text-muted">
                <span>IGST</span>
                <span className="font-mono tabular-nums text-text">{formatCurrencyINR(igstTotal)}</span>
              </div>
            )}
            {showTax && !partnerHasGstin && (
              <div className="flex justify-between text-text-muted">
                <span>Tax</span>
                <span className="font-mono tabular-nums text-text">{formatCurrencyINR(totals.taxTotal)}</span>
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

      <div className="rounded-md border border-border bg-bg-raised p-4">
        <h2 className="font-display text-sm font-bold text-text">On this Invoice</h2>
        <p className="mt-1 text-xs text-text-muted">
          This is how the invoice footer will actually look. Click a tile to include/exclude it; anything not yet
          set up in Settings shows as a placeholder you can jump straight to.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <FooterTile
            icon={<QrCode className="h-4 w-4" />}
            label="UPI Payment QR"
            configured={upiConfigured}
            preview={partnerUpiId ?? undefined}
            enabled={showUpiQr}
            onToggle={() =>
              setShowUpiQr((v) => {
                const next = !v;
                // Bank Details and UPI QR are mutually exclusive on the
                // printed invoice — a customer should only ever see one
                // payment option at once, same rule AN-CRM's invoice uses.
                if (next) setShowBankDetails(false);
                return next;
              })
            }
            settingsHref={partnerId ? `/partner/${partnerId}/settings?tab=bank-details` : undefined}
          />
          <FooterTile
            icon={<Landmark className="h-4 w-4" />}
            label="Bank Account Details"
            configured={bankConfigured}
            preview={
              bankConfigured
                ? [partnerBankDetails?.accountName, maskAccountNumber(partnerBankDetails?.accountNumber)]
                    .filter(Boolean)
                    .join(" · ")
                : undefined
            }
            enabled={showBankDetails}
            onToggle={() =>
              setShowBankDetails((v) => {
                const next = !v;
                if (next) setShowUpiQr(false);
                return next;
              })
            }
            settingsHref={partnerId ? `/partner/${partnerId}/settings?tab=bank-details` : undefined}
          />
          <FooterTile
            icon={<FileText className="h-4 w-4" />}
            label="Terms & Conditions"
            configured={Boolean(terms.trim())}
            preview={terms.trim() || undefined}
            enabled={showTerms}
            onToggle={() => setShowTerms((v) => !v)}
            notConfiguredHint="Type Terms & Conditions above to include it"
          />
          <FooterTile
            icon={<StickyNote className="h-4 w-4" />}
            label="Notes"
            configured={Boolean(notes.trim())}
            preview={notes.trim() || undefined}
            enabled={showNotes}
            onToggle={() => setShowNotes((v) => !v)}
            notConfiguredHint="Type a note above to include it"
          />
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
    </>
  );
}

/**
 * One "On this Invoice" footer element (UPI QR / Bank Details / Terms /
 * Notes) rendered the way it will actually look on the printed document —
 * a real preview snippet when the underlying data exists, or a dashed
 * "not set up yet" placeholder otherwise. Clicking a configured tile
 * toggles its inclusion on THIS invoice; clicking an unconfigured one jumps
 * to Settings (for Bank/UPI) or just explains where to add it (for
 * Terms/Notes, which are typed right in this form). Ports AN-CRM's real
 * invoice-footer-tile feature (src/app/console/common/sales/new/_NewSalesInvoice.tsx,
 * InvoiceFooterTile) rather than a plain checkbox list, so a partner sees
 * exactly what will print instead of guessing.
 */
function FooterTile({
  icon,
  label,
  configured,
  preview,
  enabled,
  onToggle,
  settingsHref,
  notConfiguredHint,
}: {
  icon: React.ReactNode;
  label: string;
  configured: boolean;
  preview?: string;
  enabled: boolean;
  onToggle: () => void;
  /** Where an unconfigured Bank/UPI tile links to set it up — omitted for Terms/Notes, which are edited in this same form. */
  settingsHref?: string;
  /** Shown instead of a Settings link for an unconfigured Terms/Notes tile. */
  notConfiguredHint?: string;
}) {
  if (!configured) {
    const body = (
      <>
        <Plus className="h-4 w-4 text-text-muted" />
        <span className="text-center text-[11px] text-text-muted">
          {settingsHref ? `Add ${label} in Settings` : notConfiguredHint ?? `${label} not set up yet`}
        </span>
      </>
    );
    if (settingsHref) {
      return (
        <Link
          href={settingsHref}
          className="flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-bg px-3 py-4 text-center transition-colors hover:border-accent"
        >
          {body}
        </Link>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-bg px-3 py-4 text-center">
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-md border px-3 py-4 text-center transition-colors ${
        enabled ? "border-accent bg-accent/10" : "border-border bg-bg hover:border-teal"
      }`}
    >
      <div className="flex items-center gap-1.5 text-text">
        {icon}
        <span className="text-xs font-medium">{label}</span>
        {enabled && <Check className="h-3.5 w-3.5 text-accent" />}
      </div>
      {preview && <span className="line-clamp-2 max-w-full text-[11px] text-text-muted">{preview}</span>}
      <span className="text-[10px] text-text-muted">{enabled ? "Included" : "Excluded — click to include"}</span>
    </button>
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
