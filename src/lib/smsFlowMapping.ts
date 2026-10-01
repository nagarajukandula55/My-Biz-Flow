import { prisma } from "@/lib/prisma";
export type SmsFlowMapping = { flowId: string; senderId: string; variables: Record<string, string>; enabled: boolean };
export async function getSmsFlowMapping(purpose: string): Promise<SmsFlowMapping | null> {
  const row = await prisma.businessRecord.findUnique({ where: { partnerId_moduleSlug_recordKey: {
    partnerId: "__platform_sms_flows__", moduleSlug: "platform-sms-flows", recordKey: purpose,
  } } });
  if (!row) return null;
  const mapping = row.data as unknown as SmsFlowMapping;
  return mapping.enabled && mapping.flowId && mapping.senderId ? mapping : null;
}

export function buildSmsFlowPayload(mapping: SmsFlowMapping, to: string, values: Record<string, string>) {
  const mobiles = to.replace(/[\s+()-]/g, "");
  if (!/^[1-9]\d{7,14}$/.test(mobiles)) throw new Error("Use a phone number including its country code.");
  const recipient: Record<string, string> = { mobiles };
  for (const [variable, source] of Object.entries(mapping.variables)) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,49}$/.test(variable) || variable === "mobiles" || !Object.prototype.hasOwnProperty.call(values, source)) throw new Error("Invalid SMS variable mapping.");
    recipient[variable] = values[source];
  }
  return { flow_id: mapping.flowId, sender: mapping.senderId, recipients: [recipient] };
}
