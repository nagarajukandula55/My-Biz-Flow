import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { createFiscalPeriodAction } from "../../actions";

registerPage({
  id: "accounting.fiscal-periods.create",
  moduleSlug: "accounting",
  title: "Accounting — New Fiscal Period",
  path: "/partner/[partnerId]/accounting/fiscal-periods/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Creates a new FiscalPeriod, initially open.",
  sourceFile: "src/app/partner/[partnerId]/accounting/fiscal-periods/new/page.tsx",
});

const fields: FormFieldDef[] = [
  { key: "name", label: "Name", type: "text", required: true, placeholder: "e.g. FY 2026-27 Q1" },
  { key: "startDate", label: "Start Date", type: "date", required: true },
  { key: "endDate", label: "End Date", type: "date", required: true },
];

export default async function NewFiscalPeriodPage({ params }: { params: { partnerId: string } }) {
  return (
    <AppShell topbarTitle="New Fiscal Period">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Fiscal Period</h1>
        <p className="mt-1 text-sm text-text-muted">Define a period this partner's books can later be closed against.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Period" action={createFiscalPeriodAction.bind(null, params.partnerId)} />
        </div>
      </div>
    </AppShell>
  );
}
