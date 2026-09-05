-- AlterTable
ALTER TABLE "vendor_types" ADD COLUMN     "requiresApproval" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "vendor_signup_requests" (
    "id" TEXT NOT NULL,
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
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_signup_requests_pkey" PRIMARY KEY ("id")
);
