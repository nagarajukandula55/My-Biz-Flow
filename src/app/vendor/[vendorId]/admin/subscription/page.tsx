import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { StatusChip } from "@/components/StatusChip";
import { DashboardWidget } from "@/components/DashboardWidget";
import { notFound } from "next/navigation";
import { getVendor } from "@/lib/vendorData";
import { getVendorType } from "@/lib/designer/vendorTypesData";

registerPage({
  id: "subscription.vendor-view",
  moduleSlug: "platform",
  title: "Subscription — Vendor View",
  path: "/vendor/[vendorId]/admin/subscription",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Vendor-facing account summary: Vendor Type and account status — real data (Vendor table). Documented routing note: lives under /admin/subscription rather than at /vendor/[vendorId]/billing, since 'billing' was already taken by the Billing module's own invoicing pages; this is about the vendor's OWN platform account, not customer invoicing. No plan/seat/billing-cycle tracking exists yet — no payment gateway or subscription engine is wired up, so this deliberately doesn't show fabricated plan/seat data.",
  sourceFile: "src/app/vendor/[vendorId]/admin/subscription/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function VendorSubscriptionPage({ params }: { params: { vendorId: string } }) {
  const vendor = await getVendor(params.vendorId);
  if (!vendor) notFound();
  const vendorType = await getVendorType(vendor.vendorTypeId);

  return (
    <AppShell topbarTitle="Subscription">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Subscription</h1>
        <p className="mt-1 text-sm text-text-muted">
          Your account&apos;s Vendor Type and status. Plan/billing-cycle tracking isn&apos;t built yet — no
          payment gateway or subscription engine is wired up.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <DashboardWidget label="Vendor Type" value={vendorType?.id ?? vendor.vendorTypeId} />
          <DashboardWidget label="Vendor ID" value={vendor.id} />
          <DashboardWidget label="Status" value={vendor.status} />
        </div>

        <div className="mt-6 rounded-lg border border-border bg-bg-raised p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-text">{vendorType?.id ?? vendor.vendorTypeId}</h2>
              {vendorType?.description && <p className="mt-1 text-sm text-text-muted">{vendorType.description}</p>}
            </div>
            <StatusChip label={vendor.status} variant={vendor.status === "Active" ? "success" : "danger"} />
          </div>

          {vendorType && (
            <div className="mt-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Modules enabled
              </div>
              <div className="flex flex-wrap gap-1.5">
                {vendorType.defaultModules.map((slug) => (
                  <StatusChip key={slug} label={slug} variant="teal" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
