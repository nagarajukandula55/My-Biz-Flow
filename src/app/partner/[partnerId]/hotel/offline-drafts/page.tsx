import { AppShell } from "@/components/AppShell";
import { OfflineDraftsClient } from "../../inventory/offline-drafts/OfflineDraftsClient";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "hotel.offline-drafts",
  moduleSlug: "hotel",
  title: "Hotel - Offline Reservation Drafts",
  path: "/partner/[partnerId]/hotel/offline-drafts",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Review locally saved reservation requests. Sync rechecks room availability, dates, guest capacity, tax settings, and current rates online; payments and check-in/out require a connection.",
  sourceFile: "src/app/partner/[partnerId]/hotel/offline-drafts/page.tsx",
});

export const dynamic = "force-dynamic";
export default function HotelOfflineDraftsPage({ params }: { params: { partnerId: string } }) {
  return <AppShell topbarTitle="Hotel offline requests"><div className="space-y-4 p-4"><p className="rounded border border-warning bg-warning-soft p-3 text-sm">Offline reservation requests are not confirmed until sync succeeds. The server rechecks room availability, dates, capacity, tax configuration and current room rate. Payments, check-in and checkout require a connection.</p><OfflineDraftsClient partnerId={params.partnerId} /></div></AppShell>;
}
