import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { expenseFormFields } from "@/lib/sample-data/billing-expenses";
import { applyCustomizations } from "@/lib/designer/customizations";
import { notFound } from "next/navigation";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "billing.expenses.edit",
  moduleSlug: "billing",
  title: "Billing — Expenses — Edit",
  path: "/partner/[partnerId]/billing/expenses/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing expense's data, letting a user edit and save changes.",
  sourceFile: "src/app/partner/[partnerId]/billing/expenses/[recordId]/edit/page.tsx",
});

export default async function EditExpensePage({ params }: { params: { partnerId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.partnerId, "billing-expenses", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("billing.expenses.edit", expenseFormFields);

  return (
    <AppShell topbarTitle="Edit Expense">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Edit Expense</h1>
        <p className="mt-1 text-xs text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={(values: Record<string, unknown>) => updateBusinessRecordAction(params.partnerId, "billing-expenses", params.recordId, values, "billing/expenses")}
          />
        </div>
      </div>
    </AppShell>
  );
}
