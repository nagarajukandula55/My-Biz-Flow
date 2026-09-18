-- Extensible list of enabled WhatsApp automated-message trigger keys —
-- edited from My-Biz-Flow-Admin (same physical database). Empty array by
-- default means every trigger stays off until explicitly enabled.
ALTER TABLE "platform_settings" ADD COLUMN "enabledWhatsappTriggers" JSONB NOT NULL DEFAULT '[]';
