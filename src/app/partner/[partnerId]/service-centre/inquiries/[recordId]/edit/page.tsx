import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { inquiryFormFields } from "@/lib/sample-data/service-centre-inquiry";
import { applyCustomizations } from "@/lib/designer/customizations";
import { notFound, redirect } from "next/navigation";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "service-centre.inquiries.edit",
  moduleSlug: "service-centre",
  title: "Inquiries — Edit",
  path: "/partner/[partnerId]/service-centre/inquiries/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation:
    "The same config-driven RecordForm pre-populated with an existing inquiry's data, letting staff correct a typo'd name/phone/complaint/etc. Only an Open inquiry can be edited here — a Converted/Closed inquiry is read-only from the detail page on, same rule InquiryLifecycle.tsx enforces for status changes.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/inquiries/[recordId]/edit/page.tsx",
});

export default async function EditInquiryPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.partnerId, "service-centre-inquiry", params.recordId);
  if (!record) notFound();
  if (record["status"] !== "Open") {
    redirect(`/partner/${params.partnerId}/service-centre/inquiries/${params.recordId}`);
  }
  const fields = await applyCustomizations("service-centre.inquiries.edit", inquiryFormFields);

  return (
    <AppShell topbarTitle="Edit Inquiry">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Edit Inquiry</h1>
        <p className="mt-1 text-xs text-text-muted">{String(record["customerName"] ?? params.recordId)}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={(values: Record<string, unknown>) =>
              updateBusinessRecordAction(
                params.partnerId,
                "service-centre-inquiry",
                params.recordId,
                values,
                "service-centre/inquiries"
              )
            }
          />
        </div>
      </div>
    </AppShell>
  );
}
