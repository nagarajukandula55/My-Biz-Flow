import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import {
  getServiceCentreTimeline,
  serviceCentreRelated,
  extractLifecycleFromRecord,
} from "@/lib/sample-data/service-centre";
import { getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { getPartner } from "@/lib/partnerData";
import { activeStaffNames } from "@/lib/sample-data/service-centre-staff-names";
import { WorkorderLifecycle } from "./WorkorderLifecycle";
import { getPageTierAccess } from "@/lib/tenant";
import {
  createServiceCentreBrandInlineAction,
  createServiceCentreModelInlineAction,
  createServiceCentreBomMaterialInlineAction,
} from "@/lib/serviceCentreCatalogActions";

registerPage({
  id: "service-centre.detail",
  moduleSlug: "service-centre",
  title: "Service Centre — Detail",
  path: "/partner/[partnerId]/service-centre/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single workorder, rendered via the shared RecordDetail component (activity timeline + related records rail only — the old field-grid section was removed as pure duplication of AN-CRM's real job-sheet page), with Delete in the header. The WorkorderLifecycle panel above it carries the real domain logic: Brand/Model selection against this partner's own live catalogs, an estimate-approval feature (Mark Estimate Approved) that does NOT gate stage progression (matching AN-CRM — Proceed for Repair works unconditionally), a Hold (Parts Pending) side-state distinct from Cancelled, and real Billing-invoice creation on Close.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ServiceCentreDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  const mod = await getModule("service-centre");
  const record = await getBusinessRecord(params.partnerId, "service-centre", params.recordId);
  if (!record) notFound();
  const timeline = getServiceCentreTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);
  const lifecycle = extractLifecycleFromRecord(record);
  const bomRecords = await listBusinessRecords(params.partnerId, "inventory-bom");
  const bomMaterials = bomRecords
    .filter((r) => r["status"] === "Active")
    .map((r) => ({
      id: String(r["id"]),
      label: `${r["id"]} — ${r["description"] ?? ""}`,
      serialized: Boolean(r["serialized"]),
      // Real catalog price/tax, stamped onto a part line when it's added so
      // the quantity entered on the line actually prices out.
      rate: typeof r["rate"] === "number" ? r["rate"] : undefined,
      taxPercent: typeof r["taxPercent"] === "number" ? r["taxPercent"] : undefined,
    }));
  const solutionRecords = await listBusinessRecords(params.partnerId, "service-centre-solutions");
  const activeSolutions = solutionRecords.filter((r) => r["status"] === "Active");
  const solutionOptions = activeSolutions.map((r) => ({ value: String(r["id"]), label: String(r["title"] ?? r["id"]) }));
  // Settings > Config's default labour charge — used below as the fallback
  // when a Solution itself carries no defaultLaborCharge, so a new service
  // line pre-fills with the partner's own default rather than ₹0.
  const partner = await getPartner(params.partnerId);
  // defaultLaborCharge lives on each Solution but was never read — service
  // lines were always added at ₹0. Passed through so a new line pre-fills;
  // a Solution with no charge of its own falls back to the partner-level
  // default set in Settings > Config, and only then to ₹0.
  const solutionLaborCharges = Object.fromEntries(
    activeSolutions.map((r) => [
      String(r["id"]),
      typeof r["defaultLaborCharge"] === "number" && r["defaultLaborCharge"] > 0
        ? r["defaultLaborCharge"]
        : partner?.defaultLaborCharge ?? 0,
    ])
  );

  const brandRecords = await listBusinessRecords(params.partnerId, "service-centre-brands");
  const brandOptions = brandRecords
    .filter((r) => r["status"] === "Active")
    .map((r) => ({ value: String(r["id"]), label: String(r["name"] ?? r["id"]) }));

  const modelRecords = await listBusinessRecords(params.partnerId, "service-centre-models");
  const modelOptions = modelRecords
    .filter((r) => r["status"] === "Active")
    .map((r) => ({ value: String(r["id"]), label: `${r["name"] ?? r["id"]} (${r["brandName"] ?? "—"})` }));

  // Suggestion list for the two mandatory who-did-this name fields captured
  // at handover (Engineer / Serviced By, Collected By). These are NAMES, not
  // accounts and not an assignment: a workorder is never allocated to
  // anybody in this app. A Starter partner has no roster, so this is empty
  // and both fields render as plain free text.
  const staffNameOptions = activeStaffNames(
    await listBusinessRecords(params.partnerId, "service-centre-staff-names")
  );

  // Same tier check as the New Workorder form's inline "+ Add new" — Brand
  // and Model catalogs are Pro+, so the button on this repair page must not
  // even render for a Starter partner (server-checked, not just hidden).
  // BOM materials are Pro+ gated exactly the same way — the "+ Add New
  // Part to BOM" quick-add modal must not even render for a Starter
  // partner, matching the standalone /inventory/bom/new page's own gate.
  const [brandsTier, modelsTier, bomTier] = await Promise.all([
    getPageTierAccess(params.partnerId, "service-centre.brands.create"),
    getPageTierAccess(params.partnerId, "service-centre.models.create"),
    getPageTierAccess(params.partnerId, "inventory.bom.create"),
  ]);

  return (
    <AppShell topbarTitle={mod?.label ?? "Manage SC"}>
      <div>
        {/* workorderId is params.recordId — the BusinessRecord recordKey,
            which is the exact value every action in ./actions.ts passes to
            getBusinessRecord(). This previously passed record["id"], a
            display label that happens to coincide with the key today but
            isn't the lookup key itself; binding the real route param
            removes any chance of a lifecycle button targeting a key that
            doesn't exist and silently doing nothing. */}
        <WorkorderLifecycle
          partnerId={params.partnerId}
          workorderId={params.recordId}
          recordLabel={recordLabel}
          customerName={typeof record["customer"] === "string" ? (record["customer"] as string) : undefined}
          customerPhone={typeof record["customerPhone"] === "string" ? (record["customerPhone"] as string) : undefined}
          imeiOrSerialNumber={typeof record["imeiOrSerialNumber"] === "string" ? (record["imeiOrSerialNumber"] as string) : undefined}
          faultDescription={typeof record["faultDescription"] === "string" ? (record["faultDescription"] as string) : undefined}
          loggedBy={typeof record["loggedBy"] === "string" ? (record["loggedBy"] as string) : undefined}
          remark={typeof record["remark"] === "string" ? (record["remark"] as string) : undefined}
          engineerRemark={typeof record["engineerRemark"] === "string" ? (record["engineerRemark"] as string) : undefined}
          initialStage={lifecycle.stage}
          initialPartLines={lifecycle.partLines}
          initialServiceLines={lifecycle.serviceLines}
          initialHandoverNotes={lifecycle.handoverNotes}
          brandId={lifecycle.brandId}
          brandName={lifecycle.brandName}
          modelId={lifecycle.modelId}
          modelName={lifecycle.modelName}
          engineerName={lifecycle.engineerName}
          collectedByName={lifecycle.collectedByName}
          onHold={lifecycle.onHold}
          holdReason={lifecycle.holdReason}
          brandJobNoForPartOrder={lifecycle.brandJobNoForPartOrder}
          estimateApproved={lifecycle.estimateApproved}
          underWarranty={Boolean(record["warrantyFlag"])}
          invoiceId={lifecycle.invoiceId}
          cancelledAt={lifecycle.cancelledAt}
          cancelReason={lifecycle.cancelReason}
          stageHistory={lifecycle.stageHistory}
          receivedDate={typeof record["receivedDate"] === "string" ? (record["receivedDate"] as string) : undefined}
          recordCreatedAt={typeof record["recordCreatedAt"] === "string" ? (record["recordCreatedAt"] as string) : undefined}
          bomMaterials={bomMaterials}
          solutionOptions={solutionOptions}
          solutionLaborCharges={solutionLaborCharges}
          brandOptions={brandOptions}
          modelOptions={modelOptions}
          staffNameOptions={staffNameOptions}
          addBrandAction={brandsTier.allowed ? createServiceCentreBrandInlineAction.bind(null, params.partnerId) : undefined}
          addModelAction={modelsTier.allowed ? createServiceCentreModelInlineAction.bind(null, params.partnerId) : undefined}
          addBomMaterialAction={bomTier.allowed ? createServiceCentreBomMaterialInlineAction.bind(null, params.partnerId) : undefined}
        />

        {/* Everything below is secondary detail, not a second page header —
            the WO#/customer/device summary, back/print/proceed/cancel
            actions and Edit/Delete all now live once, in the unified
            header WorkorderLifecycle renders above. The old "More details"
            field grid (Customer Email, Company, GSTIN, address/city/state/
            pincode, priority, dates, cost tracking, notes, etc.) has been
            removed outright — AN-CRM's real job-sheet detail page has no
            equivalent section, and it was pure duplication/clutter here.
            This block now only holds the Activity timeline and Related
            records rail, via RecordDetail with an empty `fields` list
            (RecordDetail only renders the field-grid box when fields is
            non-empty, so passing none renders nothing extra). */}
        <div className="mt-8">
        <RecordDetail
          fields={[]}
          recordLabel={recordLabel}
          searchParams={searchParams}
          timeline={timeline}
          related={serviceCentreRelated}
        />
        </div>
      </div>
    </AppShell>
  );
}
