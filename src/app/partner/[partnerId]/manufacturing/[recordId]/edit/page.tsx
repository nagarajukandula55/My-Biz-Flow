import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { notFound } from "next/navigation";
import { getProductionOrder, listBoms, listWorkCenters } from "@/lib/manufacturing";
import { updateProductionOrderAction } from "../../actions";

registerPage({
  id: "manufacturing.edit",
  moduleSlug: "manufacturing",
  title: "Manufacturing / Production — Edit",
  path: "/partner/[partnerId]/manufacturing/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
  ],
  explanation: "Edits an existing ProductionOrder's planning fields (Product Name, linked BillOfMaterial, WorkCenter, Quantity Planned, planned dates) — real Prisma persistence via updateProductionOrderAction.",
  sourceFile: "src/app/partner/[partnerId]/manufacturing/[recordId]/edit/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function EditManufacturingPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const mod = await getModule("manufacturing");
  const order = await getProductionOrder(params.partnerId, params.recordId);
  if (!order) notFound();
  const [boms, workCenters] = await Promise.all([listBoms(params.partnerId), listWorkCenters(params.partnerId)]);

  const bomOptions = boms.filter((b) => b.isActive || b.id === order.bomId).map((b) => b.id);
  const bomOptionLabels = Object.fromEntries(boms.map((b) => [b.id, `${b.productName}${b.productCode ? ` (${b.productCode})` : ""} — v${b.version}`]));
  const workCenterOptions = workCenters.filter((w) => w.isActive || w.id === order.workCenterId).map((w) => w.id);
  const workCenterOptionLabels = Object.fromEntries(workCenters.map((w) => [w.id, w.name]));

  const fields: FormFieldDef[] = [
    { key: "productName", label: "Product Name", type: "text", required: true },
    { key: "bomId", label: "Bill of Materials", type: "select", required: false, options: bomOptions, optionLabels: bomOptionLabels },
    { key: "workCenterId", label: "Work Center", type: "select", required: false, options: workCenterOptions, optionLabels: workCenterOptionLabels },
    { key: "quantityPlanned", label: "Quantity Planned", type: "number", required: true },
    { key: "plannedStartDate", label: "Planned Start Date", type: "date", required: false },
    { key: "plannedEndDate", label: "Planned End Date", type: "date", required: false },
  ];

  const initialValues = {
    productName: order.productName,
    bomId: order.bomId ?? "",
    workCenterId: order.workCenterId ?? "",
    quantityPlanned: order.quantityPlanned,
    plannedStartDate: order.plannedStartDate ? order.plannedStartDate.toISOString().slice(0, 10) : "",
    plannedEndDate: order.plannedEndDate ? order.plannedEndDate.toISOString().slice(0, 10) : "",
  };

  return (
    <AppShell topbarTitle={`Edit Production Order — ${mod?.label ?? "Manufacturing / Production"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Production Order</h1>
        <p className="mt-1 text-sm text-text-muted">{order.id}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={initialValues}
            submitLabel="Save changes"
            action={updateProductionOrderAction.bind(null, params.partnerId, params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
