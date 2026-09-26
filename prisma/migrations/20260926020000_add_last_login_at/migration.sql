-- Additive only: adds a nullable lastLoginAt timestamp to every real
-- login-identity table (Partner, PartnerStaff, Provider, Customer,
-- PosStaff), stamped on successful login going forward. No existing
-- column, table, or row is altered or dropped.

-- AlterTable
ALTER TABLE "partners" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "partner_staff" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "providers" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "pos_staff" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);
