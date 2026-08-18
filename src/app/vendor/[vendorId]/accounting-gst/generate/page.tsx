import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { accountingGstFormFields } from "@/lib/sample-data/accounting-gst";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { listBusinessRecords } from "@/lib/businessRecords";
import { getVendor } from "@/lib/vendorData";
import {
  currentPeriodKey,
  recentPeriodKeys,
  periodLabel,
  periodKeyOf,
  gstDueDates,
  computeOutwardSupply,
} from "@/lib/gst";
import { computeEligibleItcForPeriod } from "@/lib/sample-data/accounting-gst-itc";
import { GeneratePicker } from "./GeneratePicker";

registerPage({
  id: "accounting-gst.generate",
  moduleSlug: "accounting-gst",
  title: "GST — Generate Return",
  path: "/vendor/[vendorId]/accounting-gst/generate",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Pre-fills a new GST return record's taxable value, tax liability and ITC claimed from real Billing invoices and the ITC Register for the chosen period/return type, instead of typing figures by hand — the user reviews/adjusts and saves via the same RecordForm as manual entry (accounting-gst/new). Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/vendor/[vendorId]/accounting-gst/generate/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function GenerateGstReturnPage({
  params,
  searchParams,
}: {
  params: { vendorId: string };
  searchParams: { period?: string; returnType?: string };
}) {
  const period = searchParams.period ?? currentPeriodKey();
  const returnType = searchParams.returnType ?? "GSTR-1";
  const periods = recentPeriodKeys(12).map((p) => ({ value: p, label: periodLabel(p) }));

  const [invoices, itcEntries, vendor] = await Promise.all([
    listBusinessRecords(params.vendorId, "billing"),
    listBusinessRecords(params.vendorId, "accounting-gst-itc"),
    getVendor(params.vendorId),
  ]);

  const periodInvoices = invoices.filter((inv) => periodKeyOf(String(inv["issueDate"] ?? "")) === period);
  const outward = computeOutwardSupply(periodInvoices);
  const eligibleItc = computeEligibleItcForPeriod(itcEntries, period);
  const dueDates = gstDueDates(period);
  const dueDate = returnType === "GSTR-1" ? dueDates.gstr1 : dueDates.gstr3b;
  const suggestedId = `GST-${period.replace("-", "")}-${returnType.replace("GSTR-", "")}`;

  return (
    <AppShell topbarTitle="Generate GST Return">
      <div>
        <p className="text-sm text-text-muted">
          Figures below are computed live from Billing invoices issued in the selected period (and eligible ITC entries
          for GSTR-3B) — review and adjust before saving.
        </p>
        <div className="mt-4">
          <GeneratePicker periods={periods} selectedPeriod={period} selectedReturnType={returnType} />
        </div>

        <div className="mt-6 max-w-2xl">
          <RecordForm
            fields={accountingGstFormFields}
            initialValues={{
              id: suggestedId,
              gstin: vendor?.gstin ?? "",
              period: periodLabel(period),
              returnType,
              taxableValue: outward.taxableValue,
              taxLiability: outward.taxLiability,
              itcClaimed: returnType === "GSTR-3B" ? eligibleItc : 0,
              dueDate,
              filingStatus: "Pending",
            }}
            submitLabel="Save Draft Return"
            action={createBusinessRecordAction.bind(null, params.vendorId, "accounting-gst")}
          />
        </div>
      </div>
    </AppShell>
  );
}
