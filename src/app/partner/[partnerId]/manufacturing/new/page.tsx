import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { listBoms, listWorkCenters } from "@/lib/manufacturing";
import { createProductionOrderAction } from "../actions";

registerPage({
  id: "manufacturing.create",
  moduleSlug: "manufacturing",
  title: "Manufacturing / Production — Create",
  path: "/partner/[partnerId]/manufacturing/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
  ],
  explanation: "Creates a real ProductionOrder (Prisma) — picks an existing BillOfMaterial (instead of the old free-text \"BOM Reference\") and an optional WorkCenter, both from this partner's own live catalogs, plus Quantity Planned and planned dates.",
  sourceFile: "src/app/partner/[partnerId]/manufacturing/new/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function NewManufacturingPage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("manufacturing");
  const [boms, workCenters] = await Promise.all([listBoms(params.partnerId), listWorkCenters(params.partnerId)]);

  const bomOptions = boms.filter((b) => b.isActive).map((b) => b.id);
  const bomOptionLabels = Object.fromEntries(boms.map((b) => [b.id, `${b.productName}${b.productCode ? ` (${b.productCode})` : ""} — v${b.version}`]));
  const workCenterOptions = workCenters.filter((w) => w.isActive).map((w) => w.id);
  const workCenterOptionLabels = Object.fromEntries(workCenters.map((w) => [w.id, w.name]));

  const fields: FormFieldDef[] = [
    { key: "productName", label: "Product Name", type: "text", required: true },
    {
      key: "bomId",
      label: "Bill of Materials",
      type: "select",
      required: false,
      options: bomOptions,
      optionLabels: bomOptionLabels,
      help: bomOptions.length === 0 ? "No Bill of Materials yet — create one under Manufacturing > BOM first." : undefined,
    },
    {
      key: "workCenterId",
      label: "Work Center",
      type: "select",
      required: false,
      options: workCenterOptions,
      optionLabels: workCenterOptionLabels,
    },
    { key: "quantityPlanned", label: "Quantity Planned", type: "number", required: true },
    { key: "plannedStartDate", label: "Planned Start Date", type: "date", required: false },
    { key: "plannedEndDate", label: "Planned End Date", type: "date", required: false },
  ];

  return (
    <AppShell topbarTitle={`New Production Order — ${mod?.label ?? "Manufacturing / Production"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Production Order</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new production order for Manufacturing / Production.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Production Order"
            action={createProductionOrderAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
