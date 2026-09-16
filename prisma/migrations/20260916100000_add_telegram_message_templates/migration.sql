-- Admin-editable overrides for Telegram message template bodies. No row for
-- a key means the hardcoded defaultBody in telegramTemplateDefs.ts is used.
CREATE TABLE "telegram_message_templates" (
    "key" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_message_templates_pkey" PRIMARY KEY ("key")
);
