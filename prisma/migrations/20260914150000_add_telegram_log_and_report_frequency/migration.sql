-- AlterTable
ALTER TABLE "telegram_settings" ADD COLUMN     "reportFrequency" TEXT NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "telegram_log_entries" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "chatId" TEXT,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "telegram_log_entries_partnerId_createdAt_idx" ON "telegram_log_entries"("partnerId", "createdAt");
