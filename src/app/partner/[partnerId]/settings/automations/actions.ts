"use server";

import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { saveWorkflowRule } from "@/lib/workflowAutomation";
import { revalidatePath } from "next/cache";

export async function createAutomationAction(partnerId: string, formData: FormData) {
  const session = await requirePartnerSessionForPage(partnerId);
  if (session.kind !== "owner") throw new Error("Owner access is required.");
  const actionType = String(formData.get("actionType") ?? "create-task");
  const conditionField = String(formData.get("conditionField") ?? "").trim();
  const conditionValue = String(formData.get("conditionValue") ?? "").trim();
  const action = actionType === "update-record"
    ? { type: "update-record" as const, moduleSlug: String(formData.get("targetModule") ?? "billing"), field: String(formData.get("targetField") ?? "status"), value: String(formData.get("targetValue") ?? "") }
    : actionType === "send-notification"
      ? { type: "send-notification" as const, channel: String(formData.get("channel") ?? "email") as "email" | "telegram", recipient: String(formData.get("recipient") ?? ""), template: String(formData.get("template") ?? "Workflow event for {{recordId}}") }
      : { type: "create-task" as const, title: String(formData.get("taskTitle") ?? "Follow up"), dueInDays: Number(formData.get("dueInDays") ?? 1) };
  await saveWorkflowRule(partnerId, {
    name: String(formData.get("name") ?? ""),
    enabled: true,
    trigger: String(formData.get("trigger") ?? "invoice.overdue") as any,
    moduleSlug: String(formData.get("moduleSlug") ?? "billing"),
    conditions: conditionField && conditionValue ? { [conditionField]: conditionValue } : {},
    actions: [action],
  });
  revalidatePath(`/partner/${partnerId}/settings/automations`);
}
