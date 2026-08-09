import Link from "next/link";
import { notFound } from "next/navigation";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { getPlan } from "@/lib/plansData";
import { DeletePlanButton } from "./DeletePlanButton";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.plans.detail",
  moduleSlug: "platform",
  title: "Plans — Detail",
  path: "/admin/plans/[recordId]",
  kind: "detail",
  superAdminOnly: true,
  customizableRegions: [{ key: "field-grid", label: "Detail field grid" }],
  explanation: "Read-only detail view of a single Plan, with Edit and Delete actions.",
  sourceFile: "src/app/admin/(protected)/plans/[recordId]/page.tsx",
});

export default async function PlanDetailPage({ params }: { params: { recordId: string } }) {
  const plan = await getPlan(params.recordId);
  if (!plan) notFound();

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Plans</h1>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-bold text-text">{plan.name}</h1>
              <p className="mt-1 text-xs text-text-muted">
                ₹{plan.price.toLocaleString("en-IN")} / {plan.billingCycle}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin/plans" className="btn-outline">
                &larr; Back
              </Link>
              <Link href={`/admin/plans/${plan.id}/edit`} className="btn-outline">
                Edit
              </Link>
              <DeletePlanButton id={plan.id} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-bg-raised p-5">
              <h2 className="font-display text-sm font-bold text-text">Limits</h2>
              <p className="mt-2 text-sm text-text-muted">Max Users: {plan.maxUsers}</p>
              <p className="mt-1 text-sm text-text-muted">Max Locations: {plan.maxLocations}</p>
              <p className="mt-1 text-sm text-text-muted">Public: {plan.isPublic ? "Yes" : "No"}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-raised p-5">
              <h2 className="font-display text-sm font-bold text-text">
                Included Modules ({plan.includedModuleSlugs.length})
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {plan.includedModuleSlugs.map((slug) => (
                  <li key={slug} className="rounded-full border border-border bg-bg px-3 py-1.5 text-xs font-medium text-text">
                    {slug}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminGate>
  );
}
