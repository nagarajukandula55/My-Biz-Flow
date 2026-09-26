import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { notFound } from "next/navigation";
import { amcFieldServiceFormFields } from "@/lib/sample-data/amc-field-service";
import { applyCustomizations } from "@/lib/designer/customizations";
import { getAmcContract } from "@/lib/amcContractsData";
import { updateAmcContractAction } from "@/lib/amcContractActions";

registerPage({
  id: "amc-field-service.edit",
  moduleSlug: "amc-field-service",
  title: "AMC / Field Service — Edit",
  path: "/partner/[partnerId]/amc-field-service/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing contract's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/partner/[partnerId]/amc-field-service/[recordId]/edit/page.tsx",
});

export default async function EditAmcFieldServicePage({ params }: { params: { partnerId: string; recordId: string } }) {
  const mod = await getModule("amc-field-service");
  const contract = await getAmcContract(params.partnerId, params.recordId);
  if (!contract) notFound();
  const fields = await applyCustomizations("amc-field-service.edit", amcFieldServiceFormFields);
  const initialValues = {
    customer: contract.customer,
    equipment: contract.equipment,
    contractStartDate: contract.contractStartDate.toISOString().slice(0, 10),
    contractEndDate: contract.contractEndDate.toISOString().slice(0, 10),
    renewalTermMonths: contract.renewalTermMonths,
    slaHours: contract.slaHours,
    contractValue: contract.contractValue,
  };

  return (
    <AppShell topbarTitle={`Edit Contract — ${mod?.label ?? "AMC / Field Service"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Contract</h1>
        <p className="mt-1 text-sm text-text-muted">{contract.id}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={initialValues}
            submitLabel="Save changes"
            action={updateAmcContractAction.bind(null, params.partnerId, params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
