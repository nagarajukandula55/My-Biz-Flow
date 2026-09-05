-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "billingCycle" TEXT,
ADD COLUMN     "offerId" TEXT,
ADD COLUMN     "planId" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT NOT NULL DEFAULT 'Trial',
ADD COLUMN     "trialEndAt" TIMESTAMP(3),
ADD COLUMN     "trialStartAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL DEFAULT 'percent',
    "discountValue" INTEGER NOT NULL DEFAULT 0,
    "planIds" JSONB NOT NULL DEFAULT '[]',
    "billingCycles" JSONB NOT NULL DEFAULT '[]',
    "isCombo" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);
