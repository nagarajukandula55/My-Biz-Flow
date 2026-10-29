import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { OfflineDraftsClient } from "./OfflineDraftsClient";

registerPage({ id: "inventory.offline-drafts", moduleSlug: "inventory", title: "Offline Drafts", path: "/partner/[partnerId]/inventory/offline-drafts", kind: "list", superAdminOnly: false, customizableRegions: [], explanation: "Shows only drafts stored in this browser's local offline queue. Users can inspect the payload and remove a draft; this page never presents cached tenant records or claims that a draft has synchronized.", sourceFile: "src/app/partner/[partnerId]/inventory/offline-drafts/page.tsx" });
export const dynamic = "force-dynamic";
export default function OfflineDraftsPage() { return <AppShell topbarTitle="Offline Drafts"><div className="mbf-page space-y-4 p-6"><p className="text-sm text-text-muted">These drafts are stored only on this device and remain pending until an approved sync flow processes them.</p><OfflineDraftsClient /></div></AppShell>; }
