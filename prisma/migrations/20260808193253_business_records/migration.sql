-- CreateTable
CREATE TABLE "business_records" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "moduleSlug" TEXT NOT NULL,
    "recordKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_records_vendorId_moduleSlug_idx" ON "business_records"("vendorId", "moduleSlug");

-- CreateIndex
CREATE UNIQUE INDEX "business_records_vendorId_moduleSlug_recordKey_key" ON "business_records"("vendorId", "moduleSlug", "recordKey");
