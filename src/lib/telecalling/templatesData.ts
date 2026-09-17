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
  input: { name: string; channel: MessageChannel; category: string; body: string }
): Promise<MessageTemplateRecord> {
  return prisma.messageTemplate.create({
    data: { partnerId, name: input.name, channel: input.channel, category: input.category, body: input.body },
  });
}

export async function updateTemplate(
  id: string,
  partnerId: string,
  input: { name: string; channel: MessageChannel; category: string; body: string }
): Promise<void> {
  const existing = await prisma.messageTemplate.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.messageTemplate.update({
    where: { id },
    data: { name: input.name, channel: input.channel, category: input.category, body: input.body },
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
