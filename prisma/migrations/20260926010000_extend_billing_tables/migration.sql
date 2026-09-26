-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "cgstAmount" INTEGER,
ADD COLUMN     "customerAddress" TEXT,
ADD COLUMN     "customerCity" TEXT,
ADD COLUMN     "customerCompany" TEXT,
ADD COLUMN     "customerContactId" TEXT,
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "customerPincode" TEXT,
ADD COLUMN     "customerState" TEXT,
ADD COLUMN     "igstAmount" INTEGER,
ADD COLUMN     "sgstAmount" INTEGER,
ADD COLUMN     "showBankDetails" BOOLEAN,
ADD COLUMN     "showNotes" BOOLEAN,
ADD COLUMN     "showTerms" BOOLEAN,
ADD COLUMN     "showUpiQr" BOOLEAN,
ADD COLUMN     "sourcePosSaleId" TEXT,
ADD COLUMN     "sourceWorkorderId" TEXT,
ADD COLUMN     "supplyType" TEXT;

-- AlterTable
ALTER TABLE "credit_notes" ADD COLUMN     "items" JSONB NOT NULL DEFAULT '[]';

