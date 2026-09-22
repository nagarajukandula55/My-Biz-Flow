-- Closes a long-standing gap: schema.prisma has defined Provider/Customer/
-- Booking/etc. models for a while, but no migration ever created their
-- tables (confirmed via `prisma migrate diff` against the live DB — this
-- is the only real drift found, once admin_audit_logs, which belongs to
-- the separate My-Biz-Flow-Admin app's own schema/migration history, is
-- excluded). Also cleans up "engineers"/"engineer_services"/
-- "engineer_service_areas" — orphan tables from an earlier "Engineer"
-- design that predates the Provider rename, and un-sticks job_allocations
-- (still carrying that old design's engineerId/jobRef columns instead of
-- today's bookingId/providerId). Verified empty (0 rows) on both
-- job_allocations and services before writing this, and 0 rows on all
-- three engineer* tables, so none of this drops real data.

-- DropForeignKey (old Engineer-era FKs)
ALTER TABLE "engineer_service_areas" DROP CONSTRAINT "engineer_service_areas_engineerId_fkey";
ALTER TABLE "engineer_services" DROP CONSTRAINT "engineer_services_engineerId_fkey";
ALTER TABLE "engineer_services" DROP CONSTRAINT "engineer_services_serviceId_fkey";
ALTER TABLE "job_allocations" DROP CONSTRAINT "job_allocations_engineerId_fkey";

-- DropIndex
DROP INDEX "job_allocations_engineerId_idx";

-- AlterTable: job_allocations onto today's Booking/Provider shape
ALTER TABLE "job_allocations" DROP COLUMN "engineerId",
DROP COLUMN "jobRef",
ADD COLUMN     "bookingId" TEXT NOT NULL,
ADD COLUMN     "providerId" TEXT NOT NULL;

-- AlterTable: services gains Field Force's pricing/duration/skill fields
ALTER TABLE "services" ADD COLUMN     "basePrice" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "durationMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "minSkillLevel" TEXT NOT NULL DEFAULT 'skilled',
ADD COLUMN     "priceType" TEXT NOT NULL DEFAULT 'fixed';

-- DropTable (empty orphans from the pre-Provider "Engineer" design)
DROP TABLE "engineer_service_areas";
DROP TABLE "engineer_services";
DROP TABLE "engineers";

-- CreateTable
CREATE TABLE "providers" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "source" TEXT,
    "pincode" TEXT NOT NULL,
    "skillLevel" TEXT NOT NULL DEFAULT 'skilled',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "passwordHash" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "teamLeadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_services" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "provider_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_service_areas" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT,
    "locality" TEXT,
    "pincode" TEXT,

    CONSTRAINT "provider_service_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_offers" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "job_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_force_notifications" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "recipientId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "relatedBookingId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "field_force_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_force_settings" (
    "partnerId" TEXT NOT NULL,
    "customerSignupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "providerSignupEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "field_force_settings_pkey" PRIMARY KEY ("partnerId")
);

-- CreateTable
CREATE TABLE "platform_fee_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "feeType" TEXT NOT NULL DEFAULT 'percent',
    "feeValue" INTEGER NOT NULL DEFAULT 0,
    "chargeParty" TEXT NOT NULL DEFAULT 'customer',
    "providerSharePercent" INTEGER NOT NULL DEFAULT 50,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_fee_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Home',
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "landmark" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "providerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "slotLabel" TEXT NOT NULL,
    "priceAmount" INTEGER NOT NULL,
    "finalPrice" INTEGER,
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "notes" TEXT,
    "platformFeeAmount" INTEGER,
    "customerPayable" INTEGER,
    "providerPayout" INTEGER,
    "ratingValue" INTEGER,
    "ratingComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_payments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'created',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "providers_partnerId_idx" ON "providers"("partnerId");
CREATE INDEX "providers_pincode_idx" ON "providers"("pincode");
CREATE UNIQUE INDEX "providers_partnerId_phone_key" ON "providers"("partnerId", "phone");
CREATE UNIQUE INDEX "provider_services_providerId_serviceId_key" ON "provider_services"("providerId", "serviceId");
CREATE INDEX "provider_service_areas_providerId_idx" ON "provider_service_areas"("providerId");
CREATE INDEX "job_offers_bookingId_idx" ON "job_offers"("bookingId");
CREATE INDEX "job_offers_providerId_idx" ON "job_offers"("providerId");
CREATE INDEX "job_offers_partnerId_idx" ON "job_offers"("partnerId");
CREATE INDEX "field_force_notifications_partnerId_audience_recipientId_idx" ON "field_force_notifications"("partnerId", "audience", "recipientId");
CREATE INDEX "customers_partnerId_idx" ON "customers"("partnerId");
CREATE UNIQUE INDEX "customers_partnerId_phone_key" ON "customers"("partnerId", "phone");
CREATE INDEX "addresses_customerId_idx" ON "addresses"("customerId");
CREATE UNIQUE INDEX "bookings_bookingNumber_key" ON "bookings"("bookingNumber");
CREATE INDEX "bookings_partnerId_idx" ON "bookings"("partnerId");
CREATE INDEX "bookings_providerId_idx" ON "bookings"("providerId");
CREATE INDEX "bookings_status_idx" ON "bookings"("status");
CREATE UNIQUE INDEX "booking_payments_razorpayPaymentId_key" ON "booking_payments"("razorpayPaymentId");
CREATE INDEX "booking_payments_bookingId_idx" ON "booking_payments"("bookingId");
CREATE INDEX "job_allocations_providerId_idx" ON "job_allocations"("providerId");
CREATE INDEX "job_allocations_bookingId_idx" ON "job_allocations"("bookingId");

-- AddForeignKey
ALTER TABLE "providers" ADD CONSTRAINT "providers_teamLeadId_fkey" FOREIGN KEY ("teamLeadId") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "provider_services" ADD CONSTRAINT "provider_services_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "provider_services" ADD CONSTRAINT "provider_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "provider_service_areas" ADD CONSTRAINT "provider_service_areas_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_allocations" ADD CONSTRAINT "job_allocations_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_allocations" ADD CONSTRAINT "job_allocations_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "booking_payments" ADD CONSTRAINT "booking_payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
