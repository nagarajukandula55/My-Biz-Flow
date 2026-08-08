import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { LoyaltyRewardsClientTable } from "./LoyaltyRewardsClientTable";
import { LoyaltyRewardsNewButton } from "./LoyaltyRewardsNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { loyaltyRewardsColumns } from "@/lib/sample-data/loyalty-rewards";

registerPage({
  id: "loyalty-rewards.list",
  moduleSlug: "loyalty-rewards",
  title: "Loyalty & Rewards — List",
  path: "/vendor/[vendorId]/loyalty-rewards",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every member record for the loyalty-rewards module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/loyalty-rewards/page.tsx",
});

export default async function LoyaltyRewardsPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("loyalty-rewards");
  const columns = await applyCustomizations("loyalty-rewards.list", loyaltyRewardsColumns);

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Loyalty & Rewards"}
      topbarActions={
        <LoyaltyRewardsNewButton />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <LoyaltyRewardsClientTable vendorId={params.vendorId} columns={columns} />
        </div>
      </div>
    </AppShell>
  );
}

