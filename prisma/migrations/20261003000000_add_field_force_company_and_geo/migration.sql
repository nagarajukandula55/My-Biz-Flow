-- Additive only: one new table, one nullable FK column on "bookings", two
-- nullable columns on "postal_pincodes". No DROP of any kind, no existing
-- column altered or renamed, no data touched. Hand-authored (not generated
-- via `prisma migrate dev`) because this shared database's migration
-- history has a pre-existing shadow-database replay bug in migration
-- 20260925150000_add_stock_lot_condition (it re-adds a column that
-- 20260925145000_recreate_orphaned_shared_tables already created inline),
-- which only surfaces when Prisma replays the full history from scratch
-- (`migrate dev`'s shadow DB) — harmless to the real database, which
-- already has both migrations marked applied, but it blocks `migrate dev`
-- from generating a new migration here. Apply this one with
-- `prisma migrate deploy`, which only runs pending migrations against the
-- real database and never touches a shadow database.

-- AlterTable
ALTER TABLE "postal_pincodes" ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "companyId" TEXT;

-- CreateTable
CREATE TABLE "field_force_companies" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "columnMapping" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_force_companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "field_force_companies_partnerId_idx" ON "field_force_companies"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "field_force_companies_partnerId_name_key" ON "field_force_companies"("partnerId", "name");

-- CreateIndex
CREATE INDEX "bookings_companyId_idx" ON "bookings"("companyId");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "field_force_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
