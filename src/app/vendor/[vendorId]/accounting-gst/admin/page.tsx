import { AppShell } from "@/components/AppShell";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "accounting-gst.admin",
  moduleSlug: "accounting-gst",
  title: "Accounting / GST Compliance — Admin",
  path: "src/app/vendor/[vendorId]/accounting-gst/admin",
  kind: "admin",
  superAdminOnly: true,
  customizableRegions: [
    { key: "field-definitions", label: "Custom fields for this module" },
    { key: "pipeline-stages", label: "Pipeline / workflow stages" },
    { key: "permissions", label: "Role permissions for this module" },
  ],
});

export default function AccountingGstAdminPage() {
  const mod = getModule("accounting-gst");

  return (
    <AppShell navGroups={buildVendorNavGroups("accounting-gst")} topbarTitle={`${mod?.label ?? "Accounting / GST Compliance"} · Admin`}>
      <SuperAdminGate>
        <div className="p-6">
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
