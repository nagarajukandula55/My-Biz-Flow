import { SuperAdminGate } from "@/components/SuperAdminGate";
import { LogoMark } from "@/components/LogoMark";
import { registerPage } from "@/lib/designer/registry";
import { SubscriberClientTable } from "./SubscriberClientTable";

registerPage({
  id: "platform.subscribers.list",
  moduleSlug: "platform",
  title: "Subscribers — List",
  path: "/admin/subscribers",
  kind: "admin",
  superAdminOnly: true,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation:
    "Super-Admin-only list of every vendor/subscription on the platform — vendor name, plan, status, start date, seat count. Row click opens that vendor's subscription view (/vendor/[vendorId]/admin/subscription), which carries the demo 'Extend / change plan' (Upgrade) action. Sample data only, no DB.",
  sourceFile: "src/app/admin/subscribers/page.tsx",
});

export default function SubscribersPage() {
  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="flex items-center gap-2 border-b border-border bg-bg-raised px-6 py-4">
          <LogoMark size={20} />
          <h1 className="font-display text-lg font-bold text-text">Subscribers</h1>
        </div>
        <div className="p-6">
          <p className="text-sm text-text-muted">
            Every vendor and its subscription state. Click a row to open that
            vendor&apos;s billing view (demo &quot;Extend / change plan&quot; action lives
            there).
          </p>
          <div className="mt-6">
            <SubscriberClientTable />
          </div>
        </div>
      </div>
    </SuperAdminGate>
  );
}
