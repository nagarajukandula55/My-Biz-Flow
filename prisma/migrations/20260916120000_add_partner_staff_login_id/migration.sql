-- AlterTable: email is now optional (Telecaller agents log in with loginId instead)
ALTER TABLE "partner_staff" ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable: add the generated per-partner login id used by the Telecalling module
ALTER TABLE "partner_staff" ADD COLUMN "loginId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "partner_staff_partnerId_loginId_key" ON "partner_staff"("partnerId", "loginId");
