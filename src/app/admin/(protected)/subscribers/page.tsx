import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { listVendors } from "@/lib/vendorData";
import { SubscriberClientTable } from "./SubscriberClientTable";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.subscribers.list",
  moduleSlug: "platform",
  title: "Subscribers — List",
  path: "/admin/subscribers",
  kind: "admin",
  superAdminOnly: true,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation:
    "Super-Admin-only list of every registered Vendor — real data (Vendor table), including subscription status, trial window, and billing cycle. Click a row to open its subscription editor. There is still no real payment gateway wired up (same documented gap as central-api) — moving a vendor from PastDue to Active once they've actually paid is a manual Super Admin action there.",
  sourceFile: "src/app/admin/(protected)/subscribers/page.tsx",
});

export default async function SubscribersPage() {
  const vendors = await listVendors();
  const rows = vendors.map((v) => ({
    id: v.id,
    businessName: v.businessName,
    vendorTypeId: v.vendorTypeId,
    status: v.status,
    subscriptionStatus: v.subscriptionStatus,
    billingCycle: v.billingCycle ?? "—",
    createdAt: v.createdAt.toISOString(),
  }));

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Subscribers</h1>
        </div>
        <div className="p-6">
          <p className="text-sm text-text-muted">
            Every registered vendor. Plan/seat/billing tracking isn&apos;t built yet — no payment gateway or
            subscription engine exists, so only real account data is shown here.
          </p>
          <div className="mt-6">
            {vendors.length === 0 ? (
              <p className="rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
                No vendors have signed up yet.
              </p>
            ) : (
              <SubscriberClientTable rows={rows} />
            )}
          </div>
        </div>
      </div>
    </SuperAdminGate>
  );
}
