import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { SubscriptionsClientTable } from "./SubscriptionsClientTable";

registerPage({
  id: "subscriptions.list",
  moduleSlug: "subscriptions",
  title: "Subscriptions / Membership — List",
  path: "/vendor/[vendorId]/subscriptions",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every membership record for the subscriptions module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/subscriptions/page.tsx",
});

export default function SubscriptionsPage({ params }: { params: { vendorId: string } }) {
  const mod = getModule("subscriptions");

  return (
    <AppShell
      navGroups={buildVendorNavGroups("subscriptions")}
      topbarTitle={mod?.label ?? "Subscriptions / Membership"}
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/subscriptions/new`} className="btn-accent">
          + New Membership
        </Link>
      }
    >
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">{mod?.label}</h1>
        <p className="mt-1 text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <SubscriptionsClientTable vendorId={params.vendorId} />
        </div>
      </div>
    </AppShell>
  );
}

