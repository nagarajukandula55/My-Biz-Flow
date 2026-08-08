import { AppShell } from "@/components/AppShell";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { buildVendorNavGroups, getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "logistics-fleet.admin",
  moduleSlug: "logistics-fleet",
  title: "Logistics / Fleet — Admin",
  path: "/vendor/[vendorId]/logistics-fleet/admin",
  kind: "admin",
  superAdminOnly: true,
  customizableRegions: [
    { key: "field-definitions", label: "Custom fields for this module" },
    { key: "pipeline-stages", label: "Pipeline / workflow stages" },
    { key: "permissions", label: "Role permissions for this module" },
  ],
  explanation: "No-code configuration screen for the logistics-fleet module (Super Admin only): custom field definitions, pipeline/workflow stages, and role permissions for this module.",
  sourceFile: "src/app/vendor/[vendorId]/logistics-fleet/admin/page.tsx",
});

export default async function LogisticsFleetAdminPage() {
  const mod = await getModule("logistics-fleet");

  return (
    <AppShell navGroups={await buildVendorNavGroups("logistics-fleet")} topbarTitle={`${mod?.label ?? "Logistics / Fleet"} · Admin`}>
      <SuperAdminGate>
        <div>
          <h1 className="font-display text-2xl font-bold text-text">
            {mod?.label} — Admin
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            No-code configuration for this module: custom fields, pipeline
            stages, and role permissions. Super Admin only.
          </p>
          <div className="mt-6 rounded-lg border border-border bg-bg-raised p-6 text-sm text-text-muted">
            Admin scaffold registered in the Designer — field/pipeline editor
            UI is a follow-up build, not yet implemented in this pass.
          </div>
        </div>
      </SuperAdminGate>
    </AppShell>
  );
}
