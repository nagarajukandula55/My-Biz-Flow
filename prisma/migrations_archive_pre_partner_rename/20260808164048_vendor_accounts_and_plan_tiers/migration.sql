/*
  Warnings:

  - You are about to drop the column `planIds` on the `vendor_types` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "vendor_types" DROP COLUMN "planIds",
ADD COLUMN     "planTierByPage" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "internalKey" TEXT NOT NULL,
    "businessId" TEXT NOT NULL DEFAULT 'BIZ002',
    "vendorTypeId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "addressLine" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "gstin" TEXT,
    "businessEmail" TEXT NOT NULL,
    "businessContact" TEXT NOT NULL,
    "loginContact" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendors_internalKey_key" ON "vendors"("internalKey");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_loginContact_key" ON "vendors"("loginContact");
