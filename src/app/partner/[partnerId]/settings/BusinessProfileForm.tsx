import type { PartnerRecord } from "@/lib/partnerData";
import { saveBusinessProfileAction } from "./actions";

/**
 * Real, persisted business-profile + bank-details editor — distinct from
 * SettingsPageClient above it (that section stays an explicit demo stub;
 * this one actually writes to the Partner row via updatePartnerBusinessProfile).
 * Fields ported from AN-CRM's vendor profile page (src/app/vendor/profile/page.tsx):
 * contact person, PAN, business category, service terms/hours, a public
 * support number, and bank details for settlement record-keeping (display
 * only — nothing debits/credits against these).
 */
export function BusinessProfileForm({ partnerId, partner }: { partnerId: string; partner: PartnerRecord }) {
  return (
    <div className="mt-10 border-t border-border pt-8">
      <h2 className="font-display text-lg font-bold text-text">Business Profile</h2>
      <p className="mt-1 text-sm text-text-muted">
        Fills in the business details signup didn&apos;t collect — real, saved fields.
      </p>

      <form action={saveBusinessProfileAction.bind(null, partnerId)} className="mt-4 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Contact Person
          <input
            type="text"
            name="contactPerson"
            defaultValue={partner.contactPerson ?? ""}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          PAN
          <input
            type="text"
            name="pan"
            defaultValue={partner.pan ?? ""}
            placeholder="ABCDE1234F"
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Business Category
          <input
            type="text"
            name="businessCategory"
            defaultValue={partner.businessCategory ?? ""}
            placeholder="e.g. Two-Wheeler Repair"
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Service Hours
          <input
            type="text"
            name="serviceHours"
            defaultValue={partner.serviceHours ?? ""}
            placeholder="Mon-Sat, 9:30am - 7:00pm"
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Public Support Number
          <input
            type="tel"
            name="supportHotline"
            defaultValue={partner.supportHotline ?? ""}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
          />
        </label>
        <label className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Service Terms (printed on quotes/invoices)
          <textarea
            name="serviceTerms"
            defaultValue={partner.serviceTerms ?? ""}
            rows={3}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
          />
        </label>

        <div className="sm:col-span-2 mt-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Bank Details (record only — no payouts are processed against these)
        </div>
        <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Account Holder Name
          <input
            type="text"
            name="bankAccountName"
            defaultValue={partner.bankAccountName ?? ""}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Bank Name
          <input
            type="text"
            name="bankName"
            defaultValue={partner.bankName ?? ""}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Account Number
          <input
            type="text"
            name="bankAccountNumber"
            defaultValue={partner.bankAccountNumber ?? ""}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          IFSC
          <input
            type="text"
            name="bankIfsc"
            defaultValue={partner.bankIfsc ?? ""}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
          />
        </label>

        <div className="sm:col-span-2">
          <button type="submit" className="btn-accent">
            Save business profile
          </button>
        </div>
      </form>
    </div>
  );
}
