import Link from "next/link";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { PlanClientTable } from "./PlanClientTable";

registerPage({
  id: "platform.plans.list",
  moduleSlug: "platform",
  title: "Plans — List",
  path: "/admin/plans",
  kind: "admin",
  superAdminOnly: true,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation:
    "Super-Admin-only CRUD over the three subscription Plans (Basic/Pro/Ultimate) — price, billing cycle, included modules (multi-select over MODULES), and seat/location limits. This is the same sample-data source the public /pricing page reads from, so they can never drift out of sync.",
  sourceFile: "src/app/admin/(protected)/plans/page.tsx",
});

export default function PlansPage() {
  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="flex items-center justify-between border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Plans</h1>
          <Link href="/admin/plans/new" className="btn-accent">
            + New Plan
          </Link>
        </div>
        <div className="p-6">
          <p className="text-sm text-text-muted">
            Backs the public <code className="font-mono text-xs">/pricing</code> page. No-code stays no-code at
            every tier — modules and seats are what&apos;s gated, not builder features.
          </p>
          <div className="mt-6">
            <PlanClientTable />
          </div>
        </div>
      </div>
    </SuperAdminGate>
  );
}
