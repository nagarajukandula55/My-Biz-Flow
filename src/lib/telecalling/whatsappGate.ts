/**
 * Per-partner approval gate for Telecalling's agent-triggered WhatsApp send
 * — backed by PartnerWhatsAppMessaging (prisma/schema.prisma), a table
 * OWNED by this repo but also written from My-Biz-Flow-Admin's Super Admin
 * toggle page (same physical table, same shared DB — see that model's doc
 * comment). A partner needs this AND the Telecalling module itself enabled
 * before an agent can trigger a real send; this function only checks the
 * approval row — callers are already inside a Telecalling page/action, so
 * module enablement is implied by getting there at all.
 *
 * Two levels, both required: `enabled` (WhatsApp turned on for this partner
 * at all) AND the specific template's id being in `approvedTemplateIds`
 * (Super Admin's per-partner picklist) — a template with a Meta-approved
 * name set is NOT automatically sendable just because WhatsApp is on.
 */
import { prisma } from "@/lib/prisma";

export type WhatsAppMessagingGate = { enabled: boolean; approvedTemplateIds: string[] };

export async function getWhatsAppMessagingGate(partnerId: string): Promise<WhatsAppMessagingGate> {
  const row = await prisma.partnerWhatsAppMessaging.findUnique({ where: { partnerId } });
  return { enabled: Boolean(row?.enabled), approvedTemplateIds: row?.approvedTemplateIds ?? [] };
}

export async function isWhatsAppMessagingEnabledForPartner(partnerId: string): Promise<boolean> {
  return (await getWhatsAppMessagingGate(partnerId)).enabled;
}

export async function isTemplateApprovedForWhatsApp(partnerId: string, templateId: string): Promise<boolean> {
  const gate = await getWhatsAppMessagingGate(partnerId);
  return gate.enabled && gate.approvedTemplateIds.includes(templateId);
}

/**
 * WhatsApp OTP login's per-partner approval — independent of the
 * Telecalling fields above (see PartnerWhatsAppMessaging's doc comment in
 * schema.prisma). Lives in this file rather than whatsappOtp.ts since it's
 * backed by the same PartnerWhatsAppMessaging row, even though it isn't
 * Telecalling-specific — callers are src/app/login/actions.ts (partner
 * owner) and src/lib/fieldForce/actions.ts (Field Force customer).
 */
export async function isOtpLoginEnabledForPartner(partnerId: string): Promise<boolean> {
  const row = await prisma.partnerWhatsAppMessaging.findUnique({ where: { partnerId } });
  return Boolean(row?.otpLoginEnabled);
}
