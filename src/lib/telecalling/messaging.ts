/**
 * Sends a MessageTemplate to a Lead over its channel (SMS via src/lib/sms.ts,
 * WhatsApp via src/lib/whatsapp.ts — both no-op/log if unconfigured) and
 * records a MessageLog row either way, so the send history shows up even
 * before real provider keys are set.
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerScope } from "@/lib/tenant";
import { getSmsFlowMapping } from "@/lib/smsFlowMapping";
import { sendSms } from "@/lib/sms";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp";
import { fillTemplate, extractTemplateParamsInOrder } from "@/lib/telecalling/templatesData";
import { isTemplateApprovedForWhatsApp } from "@/lib/telecalling/whatsappGate";
import { env } from "@/lib/env";

/** Default language code for an agent-sent WhatsApp template when the
 * template row doesn't carry its own (Meta requires a language per send,
 * but most WABA setups approve a single-language template). */
const DEFAULT_WHATSAPP_TEMPLATE_LANG = "en_US";

export async function sendTemplateToLead(
  partnerId: string,
  input: { leadId: string; templateId: string; sentById: string; linkOverride?: string }
): Promise<{ status: "accepted" | "not-configured" | "failed"; body: string }> {
  const [lead, template] = await Promise.all([
    prisma.lead.findUniqueOrThrow({ where: { id: input.leadId } }),
    prisma.messageTemplate.findUniqueOrThrow({ where: { id: input.templateId } }),
  ]);
  assertPartnerScope(partnerId, lead.partnerId);
  assertPartnerScope(partnerId, template.partnerId);

  if (!["whatsapp", "sms"].includes(template.channel)) throw new Error("Unsupported message channel");
  const agent = await prisma.partnerStaff.findFirst({ where: { id: input.sentById, partnerId, role: "Telecaller", status: "Active" }, select: { id: true } });
  if (!agent) throw new Error("An active telecaller belonging to this partner is required");

  const values = { name: lead.name, phone: lead.phone, link: input.linkOverride || "" };
  const body = fillTemplate(template.body, values);

  if (template.channel === "whatsapp") {
    // Gated separately from "configured" below: a partner can have real
    // WhatsApp credentials set platform-wide (env.ts) and still not be
    // individually approved for THIS template — see PartnerWhatsAppMessaging's
    // doc comment in schema.prisma. Super Admin picks which templates are
    // approved per partner; WhatsApp being "on" for the partner is not
    // enough on its own.
    const approved = await isTemplateApprovedForWhatsApp(partnerId, template.id);
    if (!approved) {
      throw new Error("This WhatsApp template isn't approved for this business yet — contact support to enable it.");
    }
    if (!template.metaTemplateName) {
      throw new Error(`"${template.name}" has no approved WhatsApp template name set — add it on this template before sending.`);
    }
  }

  const configured =
    template.channel === "whatsapp"
      ? Boolean(env.whatsappBusinessPhoneNumberId() && env.whatsappAccessToken())
      : Boolean(env.smsApiKey() && await getSmsFlowMapping(`telecalling:${partnerId}:${template.id}`));

  const accepted = configured && (template.channel === "whatsapp"
    ? await sendWhatsAppTemplateMessage(
        lead.phone,
        template.metaTemplateName!,
        DEFAULT_WHATSAPP_TEMPLATE_LANG,
        extractTemplateParamsInOrder(template.body, values)
      )
    : await sendSms(lead.phone, body, { purpose: `telecalling:${partnerId}:${template.id}`, values: { name: lead.name, link: input.linkOverride || "" } }));
  const status = !configured ? "not-configured" : accepted ? "accepted" : "failed";
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
