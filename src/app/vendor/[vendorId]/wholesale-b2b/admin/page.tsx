import { AppShell } from "@/components/AppShell";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "wholesale-b2b.admin",
  moduleSlug: "wholesale-b2b",
  title: "Wholesale / Distributor B2B — Admin",
  path: "/vendor/[vendorId]/wholesale-b2b/admin",
  kind: "admin",
  superAdminOnly: true,
  customizableRegions: [
    { key: "field-definitions", label: "Custom fields for this module" },
    { key: "pipeline-stages", label: "Pipeline / workflow stages" },
    { key: "permissions", label: "Role permissions for this module" },
  ],
  explanation: "No-code configuration screen for the wholesale-b2b module (Super Admin only): custom field definitions, pipeline/workflow stages, and role permissions for this module.",
  sourceFile: "src/app/vendor/[vendorId]/wholesale-b2b/admin/page.tsx",
});

export default function WholesaleB2bAdminPage() {
  const mod = getModule("wholesale-b2b");

  return (
    <AppShell navGroups={buildVendorNavGroups("wholesale-b2b")} topbarTitle={`${mod?.label ?? "Wholesale / Distributor B2B"} · Admin`}>
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
