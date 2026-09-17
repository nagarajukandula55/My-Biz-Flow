import { AppShell } from "@/components/AppShell";
import { renderTierGate } from "@/lib/pageTierGate";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { expenseFormFields } from "@/lib/sample-data/billing-expenses";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "billing.expenses.create",
  moduleSlug: "billing",
  title: "Billing — Expenses — Create",
  path: "/partner/[partnerId]/billing/expenses/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven form for recording a business expense, built via the shared RecordForm component. Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/partner/[partnerId]/billing/expenses/new/page.tsx",
});

export default async function NewExpensePage({ params }: { params: { partnerId: string } }) {
  const tierGate = await renderTierGate(params.partnerId, "billing.expenses.create", "Expenses");
  if (tierGate) return <AppShell topbarTitle={"New Expense"}>{tierGate}</AppShell>;

  const fields = await applyCustomizations("billing.expenses.create", expenseFormFields);

  return (
    <AppShell topbarTitle="New Expense">
      <div>
        <h1 className="font-display text-xl font-bold text-text">New Expense</h1>
        <p className="mt-1 text-xs text-text-muted">Record money paid out of the business.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Record Expense"
            action={createBusinessRecordAction.bind(null, params.partnerId, "billing-expenses")}
          />
        </div>
      </div>
    </AppShell>
  );
}
