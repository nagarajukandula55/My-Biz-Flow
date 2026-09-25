import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { getOrCreateMarketplaceVendor } from "@/lib/marketplace";
import { setMarketplaceVendorActiveAction } from "./actions";
import { formatDate } from "@/lib/format";

registerPage({
  id: "marketplace.vendor.settings",
  moduleSlug: "marketplace",
  title: "Marketplace — Vendor Settings",
  path: "/partner/[partnerId]/marketplace/vendor",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "A single-record settings page for MarketplaceVendor (one per partner, get-or-create on first view — see src/lib/marketplace.ts). Toggles whether this partner is an active marketplace vendor and shows the vendor-since date. Same single-settings-row pattern as Inventory's ageing threshold, but backed by its own real Prisma table.",
  sourceFile: "src/app/partner/[partnerId]/marketplace/vendor/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function MarketplaceVendorSettingsPage({ params }: { params: { partnerId: string } }) {
  const vendor = await getOrCreateMarketplaceVendor(params.partnerId);

  return (
    <AppShell topbarTitle="Marketplace — Vendor Settings">
      <div className="max-w-xl">
        <p className="text-sm text-text-muted">
          Your Marketplace vendor profile — whether your listings are visible/orderable, and since when you've been a vendor.
        </p>

        <div className="mt-6 rounded-md border border-border bg-bg-raised p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Vendor Since</div>
          <div className="mt-0.5 text-sm text-text">{formatDate(vendor.createdAt.toISOString())}</div>
        </div>

        <form action={setMarketplaceVendorActiveAction.bind(null, params.partnerId)} className="mt-4 space-y-4">
          <label className="flex items-center gap-2 rounded-md border border-border bg-bg-raised p-4 text-sm text-text">
            <input type="checkbox" name="isActive" defaultChecked={vendor.isActive} className="h-4 w-4 rounded border-border" />
            Active vendor (listings are orderable)
          </label>
          <button type="submit" className="btn-accent">
            Save
          </button>
        </form>
      </div>
    </AppShell>
  );
}
