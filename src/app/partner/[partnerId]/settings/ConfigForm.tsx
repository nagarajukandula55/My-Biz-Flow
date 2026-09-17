import type { PartnerRecord } from "@/lib/partnerData";
import { savePartnerConfigAction } from "./actions";

const INPUT_CLASS =
  "mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent";

/**
 * Settings → Config: the operational defaults and document Terms &
 * Conditions text, kept as its own form (and its own Server Action) so
 * saving Config can never blank the Business Profile's columns and vice
 * versa. Fields ported from AN-CRM's vendor profile/settings
 * (src/app/vendor/profile/page.tsx + Business.ts): a default labour charge,
 * the business's own UPI VPA for the invoice payment QR, and general
 * Terms & Conditions with a per-document-type override each.
 */
export function ConfigForm({ partnerId, partner }: { partnerId: string; partner: PartnerRecord }) {
  return (
    <section id="settings-panel-config" className="border-t border-border pt-8">
      <h2 className="font-display text-lg font-bold text-text">Config</h2>
      <p className="mt-1 text-sm text-text-muted">
        Operational defaults and the Terms &amp; Conditions text printed on your documents — real,
        saved fields.
      </p>

      <form
        action={savePartnerConfigAction.bind(null, partnerId)}
        className="mt-4 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Default Labour Charge (₹)
          <input
            type="number"
            name="defaultLaborCharge"
            min={0}
            step={1}
            inputMode="numeric"
            defaultValue={partner.defaultLaborCharge ?? ""}
            placeholder="e.g. 300"
            className={INPUT_CLASS}
          />
          <span className="mt-1 block text-xs font-normal normal-case text-text-muted">
            Whole rupees. Used to pre-fill the labour figure when a service line is added to a
            workorder. Leave blank for no default.
          </span>
        </label>

        <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          UPI ID
          <input
            type="text"
            name="upiId"
            defaultValue={partner.upiId ?? ""}
            placeholder="yourshop@okhdfcbank"
            className={INPUT_CLASS}
          />
          <span className="mt-1 block text-xs font-normal normal-case text-text-muted">
            Your own UPI VPA. When set, the Sales Invoice prints a scannable payment QR for this
            exact amount. The customer pays you directly — no gateway is involved and nothing is
            marked paid automatically.
          </span>
        </label>

        <div className="sm:col-span-2 mt-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Terms &amp; Conditions
          </div>
          <p className="mt-1 text-xs text-text-muted">
            The general terms below print at the bottom of every document. Any document type that has
            its own text set uses that instead. Leave everything blank and no terms block is printed
            at all.
          </p>
        </div>

        <label className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          General Terms &amp; Conditions (fallback for every document)
          <textarea name="serviceTerms" defaultValue={partner.serviceTerms ?? ""} rows={3} className={INPUT_CLASS} />
        </label>

        <label className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Job Card Terms
          <textarea name="workorderTerms" defaultValue={partner.workorderTerms ?? ""} rows={3} className={INPUT_CLASS} />
          <span className="mt-1 block text-xs font-normal normal-case text-text-muted">
            Falls back to the general terms above when blank.
          </span>
        </label>

        <label className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Estimate Terms
          <textarea name="estimateTerms" defaultValue={partner.estimateTerms ?? ""} rows={3} className={INPUT_CLASS} />
          <span className="mt-1 block text-xs font-normal normal-case text-text-muted">
            Falls back to the general terms above when blank.
          </span>
        </label>

        <label className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Service Record Terms
          <textarea
            name="serviceRecordTerms"
            defaultValue={partner.serviceRecordTerms ?? ""}
            rows={3}
            className={INPUT_CLASS}
          />
          <span className="mt-1 block text-xs font-normal normal-case text-text-muted">
            Falls back to the general terms above when blank.
          </span>
        </label>

        <label className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Sales Invoice Terms
          <textarea name="invoiceTerms" defaultValue={partner.invoiceTerms ?? ""} rows={3} className={INPUT_CLASS} />
          <span className="mt-1 block text-xs font-normal normal-case text-text-muted">
            Falls back to the general terms above when blank.
          </span>
        </label>

        <div className="sm:col-span-2">
          <button type="submit" className="btn-accent">
            Save config
          </button>
        </div>
      </form>
    </section>
  );
}
