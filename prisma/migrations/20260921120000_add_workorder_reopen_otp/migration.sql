-- CreateTable
CREATE TABLE "workorder_reopen_otps" (
    "workorderId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verifiedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workorder_reopen_otps_pkey" PRIMARY KEY ("workorderId")
);
