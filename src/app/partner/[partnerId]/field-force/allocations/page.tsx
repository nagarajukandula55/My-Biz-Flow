import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { listEngineers } from "@/lib/fieldForce/engineersData";
import { listServices } from "@/lib/fieldForce/servicesData";
import { listAllocationsForPartner } from "@/lib/fieldForce/allocationsData";
import { allocateEngineerAction, updateAllocationStatusAction } from "@/lib/fieldForce/actions";
import { AllocationsClient } from "./AllocationsClient";

registerPage({
  id: "field-force.allocations",
  moduleSlug: "field-force",
  title: "Field Force — Job Allocation",
  path: "/partner/[partnerId]/field-force/allocations",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Partner-facing: given a job's pincode and required services, narrows the platform-wide engineer pool to eligible candidates (findEligibleEngineers, src/lib/fieldForce/matching.ts) and lets ops manually assign one. No charging is applied here — feeAmount/feeStatus on JobAllocation stay null (we charge partners nothing today); schema is ready for a future fee model without a migration.",
  sourceFile: "src/app/partner/[partnerId]/field-force/allocations/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function AllocationsPage({ params }: { params: { partnerId: string } }) {
  const [engineers, services, allocations] = await Promise.all([
    listEngineers(),
    listServices(),
    listAllocationsForPartner(params.partnerId),
  ]);

  const allocateAction = allocateEngineerAction.bind(null, params.partnerId);
  const updateStatusAction = updateAllocationStatusAction.bind(null, params.partnerId);

  return (
    <AppShell topbarTitle="Job Allocation">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Job Allocation</h1>
        <p className="mt-1 max-w-[65ch] text-sm text-text-muted">
          Match a job to eligible Field Force engineers by service and pincode, then assign.
        </p>
        <div className="mt-6">
          <AllocationsClient
            engineers={engineers}
            services={services}
            allocations={allocations.map((a) => ({
              id: a.id,
              engineerName: a.engineerName,
              jobRef: a.jobRef,
              status: a.status,
              assignedAt: a.assignedAt.toISOString(),
            }))}
            allocateAction={allocateAction}
            updateStatusAction={updateStatusAction}
          />
        </div>
      </div>
    </AppShell>
  );
}
