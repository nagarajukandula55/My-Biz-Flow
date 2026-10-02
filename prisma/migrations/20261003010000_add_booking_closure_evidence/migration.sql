-- Additive only: five new nullable columns on "bookings". No DROP, no
-- existing column altered/renamed, no data touched. Hand-authored for the
-- same reason as 20261003000000_add_field_force_company_and_geo — this
-- shared database's migration history has a pre-existing shadow-database
-- replay bug unrelated to this change. Apply with `prisma migrate deploy`.

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "closureNotes" TEXT,
ADD COLUMN "closurePhotoUrl" TEXT,
ADD COLUMN "closureLatitude" DOUBLE PRECISION,
ADD COLUMN "closureLongitude" DOUBLE PRECISION,
ADD COLUMN "closedAt" TIMESTAMP(3);
