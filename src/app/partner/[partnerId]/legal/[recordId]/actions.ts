"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import {
  updateLegalMatter,
  addLegalCourtDate,
  addLegalDocument,
  LEGAL_MATTER_STATUSES,
  type LegalMatterStatus,
} from "@/lib/legal";

/** Full-form edit save — RecordForm's `action` prop, bound with (partnerId, matterId). */
export async function updateLegalMatterAction(partnerId: string, matterId: string, values: Record<string, unknown>) {
  partnerId = await requireSessionPartnerId(partnerId);

  const title = String(values["title"] ?? "").trim();
  if (!title) return { error: "Title is required." };
  const clientId = values["clientId"] ? String(values["clientId"]) : undefined;

  const statusRaw = values["status"] ? String(values["status"]) : undefined;
  const status =
    statusRaw && (LEGAL_MATTER_STATUSES as readonly string[]).includes(statusRaw)
      ? (statusRaw as LegalMatterStatus)
      : undefined;

  await updateLegalMatter(partnerId, matterId, {
    clientId,
    title,
    matterType: values["matterType"] ? String(values["matterType"]) : undefined,
    status,
    openedDate: values["openedDate"] ? String(values["openedDate"]) : undefined,
  });

  revalidatePath(`/partner/${partnerId}/legal`);
  revalidatePath(`/partner/${partnerId}/legal/${matterId}`);
  redirect(`/partner/${partnerId}/legal/${matterId}?updated=1`);
}

/**
 * Sets a matter's status — replaces the old free-form MATTER_STAGES stepper
 * (New/Discovery/Filing/Hearing/Resolved, a BusinessRecord-only concept with
 * no column on LegalMatter) with the real status enum this Prisma model
 * carries (Open/InProgress/OnHold/Closed). Fires the
 * "legalMatterStatusChanged" Telegram alert from within updateLegalMatter()
 * whenever the status actually changes.
 */
export async function setLegalMatterStatusAction(partnerId: string, matterId: string, status: LegalMatterStatus): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  if (!(LEGAL_MATTER_STATUSES as readonly string[]).includes(status)) return;
  await updateLegalMatter(partnerId, matterId, { status });
  revalidatePath(`/partner/${partnerId}/legal/${matterId}`);
  revalidatePath(`/partner/${partnerId}/legal`);
}

export async function addLegalCourtDateAction(
  partnerId: string,
  matterId: string,
  input: { hearingDate: string; court?: string; purpose?: string; outcome?: string }
): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  if (!input.hearingDate) return;
  await addLegalCourtDate(partnerId, matterId, input);
  revalidatePath(`/partner/${partnerId}/legal/${matterId}`);
}

export async function addLegalDocumentAction(
  partnerId: string,
  matterId: string,
  input: { title: string; documentType?: string }
): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  if (!input.title?.trim()) return;
  await addLegalDocument(partnerId, matterId, input);
  revalidatePath(`/partner/${partnerId}/legal/${matterId}`);
}
