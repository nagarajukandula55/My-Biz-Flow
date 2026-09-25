"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createLegalMatter, LEGAL_MATTER_STATUSES, type LegalMatterStatus } from "@/lib/legal";

export async function createLegalMatterAction(partnerId: string, values: Record<string, unknown>) {
  partnerId = await requireSessionPartnerId(partnerId);

  const clientId = String(values["clientId"] ?? "").trim();
  const title = String(values["title"] ?? "").trim();
  if (!clientId) return { error: "Client is required." };
  if (!title) return { error: "Title is required." };

  const statusRaw = String(values["status"] ?? "Open");
  const status: LegalMatterStatus = (LEGAL_MATTER_STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as LegalMatterStatus)
    : "Open";

  const matter = await createLegalMatter(partnerId, {
    clientId,
    title,
    matterType: values["matterType"] ? String(values["matterType"]) : undefined,
    status,
    openedDate: values["openedDate"] ? String(values["openedDate"]) : undefined,
  });

  revalidatePath(`/partner/${partnerId}/legal`);
  redirect(`/partner/${partnerId}/legal/${matter.id}?created=1`);
}
