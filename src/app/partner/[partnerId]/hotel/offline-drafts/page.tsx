import { AppShell } from "@/components/AppShell";
import { OfflineDraftsClient } from "../../inventory/offline-drafts/OfflineDraftsClient";

export const dynamic = "force-dynamic";
export default function HotelOfflineDraftsPage({ params }: { params: { partnerId: string } }) {
  return <AppShell topbarTitle="Hotel offline requests"><div className="space-y-4 p-4"><p className="rounded border border-warning bg-warning-soft p-3 text-sm">Offline reservation requests are not confirmed until sync succeeds. The server rechecks room availability, dates, capacity, tax configuration and current room rate. Payments, check-in and checkout require a connection.</p><OfflineDraftsClient partnerId={params.partnerId} /></div></AppShell>;
}
