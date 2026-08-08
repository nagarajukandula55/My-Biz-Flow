import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { SubscriptionsClientTable } from "./SubscriptionsClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { subscriptionsColumns } from "@/lib/sample-data/subscriptions";

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

export default async function SubscriptionsPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("subscriptions");
  const columns = await applyCustomizations("subscriptions.list", subscriptionsColumns);

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Subscriptions / Membership"}
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/subscriptions/new`} className="btn-accent">
          + New Membership
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <SubscriptionsClientTable vendorId={params.vendorId} columns={columns} />
        </div>
      </div>
    </AppShell>
  );
}

