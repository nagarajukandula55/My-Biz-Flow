import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RecordForm } from "@/components/RecordForm";
import { educationFormFields } from "@/lib/sample-data/education";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createEnrollmentAction } from "../actions";

registerPage({
  id: "education.create",
  moduleSlug: "education",
  title: "Education / Coaching — Create",
  path: "/partner/[partnerId]/education/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new enrollment in the education module, built from the module's real field set via the shared RecordForm component. Submission runs createEnrollmentAction, which blocks enrollment into a full batch (checked against the batch's maxSeats in the education-batches sub-list) before persisting the record.",
  sourceFile: "src/app/partner/[partnerId]/education/new/page.tsx",
});

export default async function NewEducationPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: { blocked?: string; batch?: string };
}) {
  const mod = await getModule("education");
  const fields = await applyCustomizations("education.create", educationFormFields);
  const blocked = searchParams.blocked === "1";

  return (
    <AppShell topbarTitle={`New Enrollment — ${mod?.label ?? "Education / Coaching"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Enrollment</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new enrollment record for Education / Coaching.</p>
        {blocked && (
          <div className="mt-4 max-w-2xl rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            Batch &ldquo;{searchParams.batch ?? "selected batch"}&rdquo; is at full capacity (maxSeats reached).
            Choose a different batch, or{" "}
            <Link href={`/partner/${params.partnerId}/education/batches`} className="underline">
              manage batches
            </Link>
            .
          </div>
        )}
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Enrollment"
            action={createEnrollmentAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
