import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { SubscriptionsClientTable } from "./SubscriptionsClientTable";
import { SubscriptionsNewButton } from "./SubscriptionsNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { subscriptionsColumns } from "@/lib/sample-data/subscriptions";
import { listBusinessRecords } from "@/lib/businessRecords";

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

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("subscriptions");
  const columns = await applyCustomizations("subscriptions.list", subscriptionsColumns);
  const rows = await listBusinessRecords(params.vendorId, "subscriptions");

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Subscriptions / Membership"}
      topbarActions={
        <SubscriptionsNewButton vendorId={params.vendorId} />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <SubscriptionsClientTable vendorId={params.vendorId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}

