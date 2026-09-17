import type { PartnerRecord } from "@/lib/partnerData";
import { saveBusinessProfileAction } from "./actions";
import {
  PRODUCT_DOMAINS,
  PRODUCT_DOMAIN_DESCRIPTIONS,
  PRODUCT_DOMAIN_LABELS,
} from "@/lib/catalog/productDomains";

/**
 * Real, persisted business-profile + bank-details editor — distinct from
 * SettingsPageClient above it (that section stays an explicit demo stub;
 * this one actually writes to the Partner row via updatePartnerBusinessProfile).
 * Fields ported from AN-CRM's vendor profile page (src/app/vendor/profile/page.tsx):
 * contact person, PAN, business category, service hours, a public
 * support number, and bank details for settlement record-keeping (display
 * only — nothing debits/credits against these).
 */
export function BusinessProfileForm({ partnerId, partner }: { partnerId: string; partner: PartnerRecord }) {
  return (
    // Both the Business Profile and Bank Details tabs render this same
    // panel/form — see SettingsTabs.tsx's header for why they can't be
    // split into two forms. The settings-heading-*/settings-fields-*
    // pairs are toggled by SettingsTabs' CSS; the panel itself
    // (#settings-panel-business) stays visible for either of those two
    // tabs.
    <section id="settings-panel-business" className="border-t border-border pt-8">
      <div id="settings-heading-business-profile">
        <h2 className="font-display text-lg font-bold text-text">Business Profile</h2>
        <p className="mt-1 text-sm text-text-muted">
          Fills in the business details signup didn&apos;t collect — real, saved fields.
        </p>
      </div>
      <div id="settings-heading-bank-details">
        <h2 className="font-display text-lg font-bold text-text">Bank Details</h2>
        <p className="mt-1 text-sm text-text-muted">
          Record only — no payouts are processed against these.
        </p>
      </div>

      <form action={saveBusinessProfileAction.bind(null, partnerId)} className="mt-4 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        <div id="settings-fields-business-profile" className="contents">
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
        <div className="sm:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">What you deal in</div>
          <p className="mt-1 text-xs normal-case text-text-muted">
            Decides which Device Types, Brands and Models the workorder intake form offers you. Tick both if
            you service both.
          </p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PRODUCT_DOMAINS.map((domain) => (
              <label
                key={domain}
                className="flex cursor-pointer gap-3 rounded-md border border-border bg-bg-raised p-3"
              >
                <input
                  type="checkbox"
                  name="productDomains"
                  value={domain}
                  defaultChecked={partner.productDomains.includes(domain)}
                  className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-border accent-current text-accent"
                />
                <span>
                  <span className="block text-sm font-semibold normal-case text-text">
                    {PRODUCT_DOMAIN_LABELS[domain]}
                  </span>
                  <span className="mt-0.5 block text-xs font-normal normal-case text-text-muted">
                    {PRODUCT_DOMAIN_DESCRIPTIONS[domain]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Terms & Conditions moved to the Config section below — that's
            where the general terms and the per-document-type overrides live
            together, so the fallback rule between them is visible in one
            place. */}
        </div>

        <div id="settings-fields-bank-details" className="contents">
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
        </div>

        <div className="sm:col-span-2">
          <button type="submit" className="btn-accent">
            Save business profile
          </button>
        </div>
      </form>
    </section>
  );
}
