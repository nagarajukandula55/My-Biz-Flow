-- Singleton platform-ops config (Telegram group chat IDs for ops
-- notifications and error alerts) — same migration name as the identical
-- one in My-Biz-Flow-Admin (same physical database), which owns the
-- settings UI that writes to this table.
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "opsChatId" TEXT,
    "errorChatId" TEXT,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);
