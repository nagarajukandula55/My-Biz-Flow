"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";

/**
 * Creates a new enrollment, but only after checking the target batch's
 * capacity (maxSeats on the "education-batches" BusinessRecord vs. the
 * count of existing non-Dropped enrollments already referencing that
 * batch). A batch is matched by its Batch ID, entered on the enrollment
 * form's "batch" field. Blocking is enforced here, server-side — never
 * trust a client-submitted seat count.
 *
 * On a capacity block, redirects back to the create form with a query
 * flag so the page can render a blocked-state banner (RecordForm's action
 * contract returns Promise<void>, so there's no other channel back to the
 * form for an error message).
 */
export async function createEnrollmentAction(partnerId: string, values: Record<string, unknown>): Promise<void> {
  const batchId = String(values["batch"] ?? "").trim();

  if (batchId) {
    const batches = await listBusinessRecords(partnerId, "education-batches");
    const batch = batches.find((b) => String(b["id"]) === batchId);
    const maxSeats = batch ? Number(batch["maxSeats"]) : undefined;

    if (batch && Number.isFinite(maxSeats) && (maxSeats as number) > 0) {
      const enrollments = await listBusinessRecords(partnerId, "education");
      const seatsTaken = enrollments.filter((e) => String(e["batch"]) === batchId && e["status"] !== "Dropped").length;
      if (seatsTaken >= (maxSeats as number)) {
        redirect(
          `/partner/${partnerId}/education/new?blocked=1&batch=${encodeURIComponent(String(batch["batchName"] ?? batchId))}`
        );
      }
    }
  }

  const record = await createBusinessRecord(partnerId, "education", values);
  revalidatePath(`/partner/${partnerId}/education`);
  redirect(`/partner/${partnerId}/education/${record.id}`);
}
