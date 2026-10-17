-- Two purely additive changes — a nullable column on an existing table,
-- and a brand-new table. No ALTER ... DROP, no TRUNCATE, no rename,
-- nothing touching existing rows.

-- AlterTable: message_templates gains the Meta-approved WhatsApp template
-- name a Telecalling agent's "Send WhatsApp" send needs (see
-- src/lib/telecalling/messaging.ts). Nullable, no default needed — every
-- existing row (sms-channel or whatsapp-channel) just gets NULL here.
ALTER TABLE "message_templates" ADD COLUMN "metaTemplateName" TEXT;

-- CreateTable: per-partner WhatsApp capability flags (Telecalling
-- agent-triggered send + WhatsApp OTP login), toggled from
-- My-Biz-Flow-Admin's Super Admin UI — see PartnerWhatsAppMessaging's doc
-- comment in prisma/schema.prisma for the full design rationale.
-- NOTE: this is deliberately NOT the raw output of `prisma migrate diff`
-- against the live DB — that diff also included `DROP TABLE
-- "admin_audit_logs";`, a table belonging to the sibling My-Biz-Flow-Admin
-- repo (not declared in this repo's schema.prisma at all). That statement
-- was removed by hand before this file was ever run against the real
-- database. Never regenerate this file by blindly re-running that diff
-- command and piping it straight to execution.
CREATE TABLE "partner_whatsapp_messaging" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "enabledAt" TIMESTAMP(3),
    "enabledById" TEXT,
    "approvedTemplateIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "otpLoginEnabled" BOOLEAN NOT NULL DEFAULT false,
    "otpLoginEnabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_whatsapp_messaging_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_whatsapp_messaging_partnerId_key" ON "partner_whatsapp_messaging"("partnerId");
