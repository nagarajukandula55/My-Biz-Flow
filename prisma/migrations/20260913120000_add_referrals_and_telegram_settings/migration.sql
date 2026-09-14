-- AlterTable
ALTER TABLE "partners" ADD COLUMN     "referredByPartnerId" TEXT;

-- CreateIndex
CREATE INDEX "partners_referredByPartnerId_idx" ON "partners"("referredByPartnerId");

-- CreateTable
CREATE TABLE "telegram_settings" (
    "partnerId" TEXT NOT NULL,
    "chatId" TEXT,
    "enabledTypes" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_settings_pkey" PRIMARY KEY ("partnerId")
);
