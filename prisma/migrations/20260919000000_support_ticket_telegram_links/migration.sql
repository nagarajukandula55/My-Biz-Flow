-- Links a Telegram message this app sent about a support ticket back to
-- that ticket, so a reply can be resolved to the right conversation.
CREATE TABLE "support_ticket_telegram_links" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "messageId" INTEGER NOT NULL,
    "partnerId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_telegram_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "support_ticket_telegram_links_chatId_messageId_key" ON "support_ticket_telegram_links"("chatId", "messageId");
CREATE INDEX "support_ticket_telegram_links_partnerId_ticketId_idx" ON "support_ticket_telegram_links"("partnerId", "ticketId");
