-- AlterTable
ALTER TABLE "telegram_log_entries" ADD COLUMN     "messageId" INTEGER,
ADD COLUMN     "workorderId" TEXT;

-- CreateIndex
CREATE INDEX "telegram_log_entries_chatId_messageId_idx" ON "telegram_log_entries"("chatId", "messageId");
