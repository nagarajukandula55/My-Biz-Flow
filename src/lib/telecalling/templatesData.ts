/**
 * MessageTemplate — a reusable SMS/WhatsApp body an agent can trigger for a
 * Lead. Placeholders are simple {{name}}/{{link}}-style tokens, filled in by
 * fillTemplate() at send time (src/lib/telecalling/messaging.ts).
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerScope } from "@/lib/tenant";

export type MessageChannel = "sms" | "whatsapp";
export const TEMPLATE_CATEGORIES = ["Welcome", "ProductInfo", "FollowUp", "General"] as const;

export type MessageTemplateRecord = {
  id: string;
  partnerId: string;
  name: string;
  channel: string;
  category: string;
  body: string;
  /** Meta-approved WhatsApp template name — "whatsapp" channel only, see schema.prisma's doc comment. */
  metaTemplateName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function listTemplates(partnerId: string): Promise<MessageTemplateRecord[]> {
  return prisma.messageTemplate.findMany({ where: { partnerId }, orderBy: { createdAt: "desc" } });
}

export async function getTemplate(id: string, partnerId: string): Promise<MessageTemplateRecord | null> {
  const row = await prisma.messageTemplate.findUnique({ where: { id } });
  if (!row) return null;
  assertPartnerScope(partnerId, row.partnerId);
  return row;
}

export async function createTemplate(
  partnerId: string,
  input: { name: string; channel: MessageChannel; category: string; body: string; metaTemplateName?: string }
): Promise<MessageTemplateRecord> {
  return prisma.messageTemplate.create({
    data: {
      partnerId,
      name: input.name,
      channel: input.channel,
      category: input.category,
      body: input.body,
      metaTemplateName: input.channel === "whatsapp" ? input.metaTemplateName?.trim() || null : null,
    },
  });
}

export async function updateTemplate(
  id: string,
  partnerId: string,
  input: { name: string; channel: MessageChannel; category: string; body: string; metaTemplateName?: string }
): Promise<void> {
  const existing = await prisma.messageTemplate.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.messageTemplate.update({
    where: { id },
    data: {
      name: input.name,
      channel: input.channel,
      category: input.category,
      body: input.body,
      metaTemplateName: input.channel === "whatsapp" ? input.metaTemplateName?.trim() || null : null,
    },
  });
}

export async function deleteTemplate(id: string, partnerId: string): Promise<void> {
  const existing = await prisma.messageTemplate.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.messageTemplate.delete({ where: { id } });
}

/** Replaces {{token}} placeholders — unknown tokens are left as-is rather than throwing. */
export function fillTemplate(body: string, values: Record<string, string>): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => values[key] ?? match);
}

/**
 * Resolves this template body's {{token}} placeholders, IN THE ORDER THEY
 * APPEAR, into the ordered param array a Meta template send needs
 * (sendWhatsAppTemplateMessage's bodyParams fills the approved template's
 * {{1}}, {{2}}, ... in order — Meta has no concept of named variables, only
 * position). This only works correctly if this template's body text was
 * written with its {{tokens}} in the same order as the approved WhatsApp
 * template's own {{1}}/{{2}}/... variables — true as long as whoever set
 * metaTemplateName kept the two in sync, which is on the partner/admin
 * entering it, not something this function can verify.
 */
export function extractTemplateParamsInOrder(body: string, values: Record<string, string>): string[] {
  const params: string[] = [];
  for (const match of body.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) {
    params.push(values[match[1]] ?? "");
  }
  return params;
}
