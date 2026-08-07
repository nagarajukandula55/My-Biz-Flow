import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "logistics-fleet.list",
  moduleSlug: "logistics-fleet",
  title: "Logistics / Fleet — List",
  path: "src/app/vendor/[vendorId]/logistics-fleet",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
});

export default function LogisticsFleetPage() {
  const mod = getModule("logistics-fleet");

  return (
    <AppShell navGroups={buildVendorNavGroups("logistics-fleet")} topbarTitle={mod?.label ?? "Logistics / Fleet"}>
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">{mod?.label}</h1>
        <p className="mt-1 text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6 rounded-lg border border-border bg-bg-raised p-6 text-sm text-text-muted">
          Module scaffold registered in the Designer. Field definitions,
          pipeline stages, and records for this module are config-driven via
          the metadata engine — not yet wired to a data source in this pass.
          See <code className="font-mono">/admin/designer</code>.
        </div>
      </div>
    </AppShell>
  );
}
