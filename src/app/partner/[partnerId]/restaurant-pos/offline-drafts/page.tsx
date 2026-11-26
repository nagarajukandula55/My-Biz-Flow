import { AppShell } from "@/components/AppShell";
import { OfflineDraftsClient } from "../../inventory/offline-drafts/OfflineDraftsClient";

export const dynamic = "force-dynamic";
export default function RestaurantOfflineDraftsPage({ params }: { params: { partnerId: string } }) {
  return <AppShell topbarTitle="Restaurant offline drafts"><div className="space-y-4 p-4"><p className="rounded border border-warning bg-warning-soft p-3 text-sm">Restaurant orders are created only after online validation. Sync checks the service point is still free and menu prices/tax have not changed. Bills, payments and kitchen tickets remain online actions.</p><OfflineDraftsClient partnerId={params.partnerId} /></div></AppShell>;
}
