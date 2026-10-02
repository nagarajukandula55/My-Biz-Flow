-- AlterTable
ALTER TABLE "partners" ADD COLUMN "referredByStaffId" TEXT;

-- CreateIndex
CREATE INDEX "partners_referredByStaffId_idx" ON "partners"("referredByStaffId");
