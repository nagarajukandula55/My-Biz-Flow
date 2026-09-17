-- AlterTable
ALTER TABLE "partners" ADD COLUMN     "defaultLaborCharge" INTEGER,
ADD COLUMN     "estimateTerms" TEXT,
ADD COLUMN     "invoiceTerms" TEXT,
ADD COLUMN     "serviceRecordTerms" TEXT,
ADD COLUMN     "upiId" TEXT,
ADD COLUMN     "workorderTerms" TEXT;
