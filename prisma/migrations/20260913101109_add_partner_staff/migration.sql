-- CreateTable
CREATE TABLE "partner_staff" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Technician',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partner_staff_partnerId_idx" ON "partner_staff"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_staff_partnerId_email_key" ON "partner_staff"("partnerId", "email");
