ALTER TABLE "bookings" ADD COLUMN "companyVariantId" TEXT;
ALTER TABLE "bookings" ADD COLUMN "companyPriceAmount" INTEGER;
ALTER TABLE "bookings" ADD COLUMN "providerPayoutSnapshot" INTEGER;
ALTER TABLE "bookings" ADD COLUMN "platformMarginSnapshot" INTEGER;

CREATE TABLE "field_force_company_variants" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "variant" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "field_force_company_variants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "field_force_company_variants_companyId_brand_model_variant_key" ON "field_force_company_variants"("companyId", "brand", "model", "variant");
CREATE INDEX "field_force_company_variants_companyId_isActive_idx" ON "field_force_company_variants"("companyId", "isActive");
ALTER TABLE "field_force_company_variants" ADD CONSTRAINT "field_force_company_variants_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "field_force_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "field_force_company_prices" (
  "id" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "customerPrice" INTEGER NOT NULL,
  "providerPayout" INTEGER NOT NULL,
  "platformMargin" INTEGER NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "field_force_company_prices_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "field_force_company_prices_variantId_serviceId_isActive_idx" ON "field_force_company_prices"("variantId", "serviceId", "isActive");
ALTER TABLE "field_force_company_prices" ADD CONSTRAINT "field_force_company_prices_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "field_force_company_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "field_force_company_prices" ADD CONSTRAINT "field_force_company_prices_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_companyVariantId_fkey" FOREIGN KEY ("companyVariantId") REFERENCES "field_force_company_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "providers" ADD COLUMN "isAvailable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "providers" ADD COLUMN "availabilityNote" TEXT;
ALTER TABLE "bookings" ADD COLUMN "publicTrackingToken" TEXT;
UPDATE "bookings" SET "publicTrackingToken" = 'legacy-' || "id" WHERE "publicTrackingToken" IS NULL;
ALTER TABLE "bookings" ALTER COLUMN "publicTrackingToken" SET NOT NULL;
CREATE UNIQUE INDEX "bookings_publicTrackingToken_key" ON "bookings"("publicTrackingToken");
ALTER TABLE "job_offers" ADD COLUMN "expiresAt" TIMESTAMP(3);
CREATE INDEX "job_offers_status_expiresAt_idx" ON "job_offers"("status", "expiresAt");
ALTER TABLE "providers" ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE "providers" ADD COLUMN "verificationNote" TEXT;
ALTER TABLE "providers" ADD COLUMN "verifiedAt" TIMESTAMP(3);
ALTER TABLE "field_force_companies" ADD COLUMN "slaResponseMinutes" INTEGER;
ALTER TABLE "field_force_companies" ADD COLUMN "slaResolutionHours" INTEGER;
ALTER TABLE "field_force_companies" ADD COLUMN "escalationEmail" TEXT;
ALTER TABLE "field_force_companies" ADD COLUMN "escalationPhone" TEXT;
ALTER TABLE "field_force_settings" ADD COLUMN "maxOffersPerBooking" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "field_force_settings" ADD COLUMN "offerExpiryMinutes" INTEGER NOT NULL DEFAULT 15;
