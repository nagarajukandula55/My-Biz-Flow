-- One-time Telegram-verification code gating visibility/export of a
-- partner's own Customer database. One row per partner.
CREATE TABLE "customer_data_access_otps" (
    "partnerId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verifiedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_data_access_otps_pkey" PRIMARY KEY ("partnerId")
);
