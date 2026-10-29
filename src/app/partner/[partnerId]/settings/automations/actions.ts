"use server";

import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { saveWorkflowRule } from "@/lib/workflowAutomation";
import { revalidatePath } from "next/cache";

export async function createAutomationAction(partnerId: string, formData: FormData) {
  const session = await requirePartnerSessionForPage(partnerId);
  if (session.kind !== "owner") throw new Error("Owner access is required.");
  await saveWorkflowRule(partnerId, {
    name: String(formData.get("name") ?? ""),
    enabled: true,
    trigger: String(formData.get("trigger") ?? "invoice.overdue") as any,
    moduleSlug: String(formData.get("moduleSlug") ?? "billing"),
    actions: [{
      type: "create-task",
      title: String(formData.get("taskTitle") ?? "Follow up"),
      dueInDays: Number(formData.get("dueInDays") ?? 1),
    }],
  });
  revalidatePath(`/partner/${partnerId}/settings/automations`);
}
