import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { listChartOfAccounts, ACCOUNT_TYPES } from "@/lib/accounting";
import { createChartOfAccountAction } from "../../actions";

registerPage({
  id: "accounting.chart-of-accounts.create",
  moduleSlug: "accounting",
  title: "Accounting — New Account",
  path: "/partner/[partnerId]/accounting/chart-of-accounts/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Creates a new ChartOfAccount, optionally under a parent account (self-relation) for a hierarchy.",
  sourceFile: "src/app/partner/[partnerId]/accounting/chart-of-accounts/new/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function NewChartOfAccountPage({ params }: { params: { partnerId: string } }) {
  const accounts = await listChartOfAccounts(params.partnerId);

  const fields: FormFieldDef[] = [
    { key: "accountCode", label: "Account Code", type: "text", required: true },
    { key: "accountName", label: "Account Name", type: "text", required: true },
    { key: "accountType", label: "Account Type", type: "select", required: true, options: [...ACCOUNT_TYPES] },
    {
      key: "parentAccountId",
      label: "Parent Account",
      type: "select",
      required: false,
      options: accounts.map((a) => a.id),
      optionLabels: Object.fromEntries(accounts.map((a) => [a.id, `${a.accountCode} — ${a.accountName}`])),
    },
    { key: "isActive", label: "Active", type: "boolean", required: false },
  ];

  return (
    <AppShell topbarTitle="New Account">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Account</h1>
        <p className="mt-1 text-sm text-text-muted">Add an account to this partner&apos;s Chart of Accounts.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{ isActive: true }}
            submitLabel="Create Account"
            action={createChartOfAccountAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
