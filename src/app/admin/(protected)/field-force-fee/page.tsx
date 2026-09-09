import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { getPlatformFeeConfig } from "@/lib/fieldForce/platformFeeData";
import { updatePlatformFeeConfigAction } from "@/lib/fieldForce/actions";

registerPage({
  id: "platform.field-force-fee",
  moduleSlug: "field-force",
  title: "Field Force — Platform Commission",
  path: "/admin/field-force-fee",
  kind: "admin",
  superAdminOnly: true,
  customizableRegions: [],
  explanation:
    "Super-Admin-only, platform-wide (not per-partner) — sets the commission the platform takes on a Field Force booking: flat or percent, charged to the Customer, the Provider, or split between both. Computed at payment-collection time by src/lib/fieldForce/commission.ts; not yet automatically paid out to Providers (a ledger number only — see Booking.providerPayout).",
  sourceFile: "src/app/admin/(protected)/field-force-fee/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function FieldForceFeePage() {
  const config = await getPlatformFeeConfig();

  return (
    <SuperAdminGate>
      <div className="min-h-screen w-full bg-bg">
        <header className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Field Force — Platform Commission</h1>
          <p className="mt-1 max-w-[70ch] text-sm text-text-muted">
            One global commission rule applied across every partner's Field Force bookings at
            payment-collection time. Turning this off charges nothing (customer pays exactly the
            settled price, provider receives exactly the settled price).
          </p>
        </header>

        <div className="p-6">
          <form action={updatePlatformFeeConfigAction} className="max-w-lg space-y-4 rounded-lg border border-border bg-bg-raised p-5">
            <label className="flex items-center gap-2 text-sm text-text">
              <input type="checkbox" name="isActive" value="true" defaultChecked={config.isActive} />
              Commission active
            </label>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Fee Type</label>
              <select name="feeType" defaultValue={config.feeType} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
                <option value="percent">Percent of price</option>
                <option value="flat">Flat amount (₹)</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                Fee Value {config.feeType === "flat" ? "(₹)" : "(%)"}
              </label>
              <input
                name="feeValue"
                type="number"
                min="0"
                defaultValue={config.feeType === "flat" ? config.feeValue / 100 : config.feeValue}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Charge</label>
              <select name="chargeParty" defaultValue={config.chargeParty} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
                <option value="customer">Customer</option>
                <option value="provider">Provider</option>
                <option value="both">Both (split)</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
                Provider's share of the fee when split (%)
              </label>
              <input
                name="providerSharePercent"
                type="number"
                min="0"
                max="100"
                defaultValue={config.providerSharePercent}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
              />
              <p className="mt-1 text-xs text-text-muted">Only used when "Both" is selected above.</p>
            </div>

            <button type="submit" className="btn-accent">
              Save
            </button>
          </form>
        </div>
      </div>
    </SuperAdminGate>
  );
}
