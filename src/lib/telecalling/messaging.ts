/**
 * Sends a MessageTemplate to a Lead over its channel (SMS via src/lib/sms.ts,
 * WhatsApp via src/lib/whatsapp.ts — both no-op/log if unconfigured) and
 * records a MessageLog row either way, so the send history shows up even
 * before real provider keys are set.
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerScope } from "@/lib/tenant";
import { sendSms } from "@/lib/sms";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { fillTemplate } from "@/lib/telecalling/templatesData";
import { env } from "@/lib/env";

export async function sendTemplateToLead(
  partnerId: string,
  input: { leadId: string; templateId: string; sentById: string; linkOverride?: string }
): Promise<{ status: "sent" | "not-configured"; body: string }> {
  const [lead, template] = await Promise.all([
    prisma.lead.findUniqueOrThrow({ where: { id: input.leadId } }),
    prisma.messageTemplate.findUniqueOrThrow({ where: { id: input.templateId } }),
  ]);
  assertPartnerScope(partnerId, lead.partnerId);
  assertPartnerScope(partnerId, template.partnerId);

  const body = fillTemplate(template.body, {
    name: lead.name,
    phone: lead.phone,
    link: input.linkOverride || "",
  });

  const configured =
    template.channel === "whatsapp"
      ? Boolean(env.whatsappBusinessPhoneNumberId() && env.whatsappAccessToken())
      : Boolean(env.smsApiKey() && env.smsSenderId());

  if (template.channel === "whatsapp") {
    await sendWhatsAppMessage(lead.phone, body);
  } else {
    await sendSms(lead.phone, body);
  }

  const status = configured ? "sent" : "not-configured";
  await prisma.messageLog.create({
    data: {
      leadId: lead.id,
      templateId: template.id,
      partnerId,
      channel: template.channel,
      body,
      status,
      sentById: input.sentById,
    },
  });

  return { status, body };
}

export async function listMessagesForLead(leadId: string, partnerId: string) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  assertPartnerScope(partnerId, lead.partnerId);
  return prisma.messageLog.findMany({ where: { leadId }, orderBy: { createdAt: "desc" } });
}
