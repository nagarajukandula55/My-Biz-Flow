-- AlterTable
ALTER TABLE "partners" ADD COLUMN     "productDomains" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "partner_signup_requests" ADD COLUMN     "productDomains" JSONB NOT NULL DEFAULT '[]';
