-- AlterTable
ALTER TABLE "telegram_settings" ADD COLUMN     "groupChatId" TEXT,
ADD COLUMN     "routing" JSONB NOT NULL DEFAULT '{}';
