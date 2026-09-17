import Link from "next/link";
import type { PartnerRecord } from "@/lib/partnerData";
import { getTelegramSettings } from "@/lib/telegram";
import { PRODUCT_DOMAIN_LABELS } from "@/lib/catalog/productDomains";

/**
 * Settings → Service Centre: a read-only rollup of the Partner fields that
 * are genuinely Service-Centre-specific, so a Service Centre partner has
 * one place that says "this is how your SC module is configured" instead
 * of hunting across Business Profile / Config / a separate Telegram page.
 * Nothing here is a new field — productDomains, defaultLaborCharge and the
 * per-document terms are already editable from the Business Profile/Config
 * tabs (this panel links to them rather than duplicating the forms); the
 * Telegram connection status is real, live data
 * (src/lib/telegram.ts/getTelegramSettings) that previously had no surface
 * inside Settings at all — only on its own standalone page.
 */
export async function ServiceCentrePanel({ partnerId, partner }: { partnerId: string; partner: PartnerRecord }) {
  const telegram = await getTelegramSettings(partnerId);
  const connected = Boolean(telegram.chatId);

  return (
    <section id="settings-panel-service-centre" className="border-t border-border pt-8">
      <h2 className="font-display text-lg font-bold text-text">Service Centre</h2>
      <p className="mt-1 text-sm text-text-muted">
        How your Service Centre module is configured — edit the underlying fields from the Business
        Profile / Config tabs or the Telegram Alerts page; this is a summary view.
      </p>

      <div className="mt-4 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-bg-raised p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">What you deal in</div>
          <div className="mt-1 text-sm text-text">
            {partner.productDomains.length > 0
              ? partner.productDomains.map((d) => PRODUCT_DOMAIN_LABELS[d]).join(", ")
              : "Not set"}
          </div>
          <Link href={`/partner/${partnerId}/settings`} className="mt-2 inline-block text-xs font-semibold text-accent hover:underline">
            Edit in Business Profile →
          </Link>
        </div>

        <div className="rounded-md border border-border bg-bg-raised p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Default Labour Charge</div>
          <div className="mt-1 text-sm text-text">
            {partner.defaultLaborCharge ? `₹${partner.defaultLaborCharge}` : "Not set"}
          </div>
          <Link href={`/partner/${partnerId}/settings`} className="mt-2 inline-block text-xs font-semibold text-accent hover:underline">
            Edit in Config →
          </Link>
        </div>

        <div className="rounded-md border border-border bg-bg-raised p-3 sm:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Telegram Alerts</div>
          <div className="mt-1 text-sm text-text">
            {connected ? (
              <>
                <span className="text-success">Connected</span> — chat <span className="tabular-nums">{telegram.chatId}</span>
              </>
            ) : (
              <span className="text-text-muted">Not connected</span>
            )}
          </div>
          <Link
            href={`/partner/${partnerId}/service-centre/telegram`}
            className="mt-2 inline-block text-xs font-semibold text-accent hover:underline"
          >
            Manage Telegram Alerts →
          </Link>
        </div>

        <div className="rounded-md border border-border bg-bg-raised p-3 sm:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Job Card Terms &amp; UPI</div>
          <div className="mt-1 text-sm text-text">
            UPI ID: {partner.upiId || "Not set"} · Job Card Terms: {partner.workorderTerms ? "Set" : "Using general terms"}
          </div>
          <Link href={`/partner/${partnerId}/settings`} className="mt-2 inline-block text-xs font-semibold text-accent hover:underline">
            Edit in Config →
          </Link>
        </div>
      </div>
    </section>
  );
}
