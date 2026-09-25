import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { notFound } from "next/navigation";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { getChartOfAccount, listChartOfAccounts, ACCOUNT_TYPES } from "@/lib/accounting";
import { updateChartOfAccountAction } from "../../../actions";

registerPage({
  id: "accounting.chart-of-accounts.edit",
  moduleSlug: "accounting",
  title: "Accounting — Edit Account",
  path: "/partner/[partnerId]/accounting/chart-of-accounts/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Edits an existing ChartOfAccount.",
  sourceFile: "src/app/partner/[partnerId]/accounting/chart-of-accounts/[recordId]/edit/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function EditChartOfAccountPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const account = await getChartOfAccount(params.partnerId, params.recordId);
  if (!account) notFound();
  const allAccounts = await listChartOfAccounts(params.partnerId);
  const parentOptions = allAccounts.filter((a) => a.id !== account.id);

  const fields: FormFieldDef[] = [
    { key: "accountCode", label: "Account Code", type: "text", required: true },
    { key: "accountName", label: "Account Name", type: "text", required: true },
    { key: "accountType", label: "Account Type", type: "select", required: true, options: [...ACCOUNT_TYPES] },
    {
      key: "parentAccountId",
      label: "Parent Account",
      type: "select",
      required: false,
      options: parentOptions.map((a) => a.id),
      optionLabels: Object.fromEntries(parentOptions.map((a) => [a.id, `${a.accountCode} — ${a.accountName}`])),
    },
    { key: "isActive", label: "Active", type: "boolean", required: false },
  ];

  return (
    <AppShell topbarTitle="Edit Account">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-text">{account.accountName}</h1>
            <p className="mt-1 text-sm text-text-muted">{account.accountCode}</p>
          </div>
          <Link href={`/partner/${params.partnerId}/accounting/chart-of-accounts`} className="btn-outline">
            &larr; Back
          </Link>
        </div>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{
              accountCode: account.accountCode,
              accountName: account.accountName,
              accountType: account.accountType,
              parentAccountId: account.parentAccountId ?? "",
              isActive: account.isActive,
            }}
            submitLabel="Save changes"
            action={updateChartOfAccountAction.bind(null, params.partnerId, account.id)}
          />
        </div>
      </div>
    </AppShell>
  );
}
