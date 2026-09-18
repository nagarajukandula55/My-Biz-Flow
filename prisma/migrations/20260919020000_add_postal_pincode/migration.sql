-- Our own India Post pincode directory table, backing
-- src/app/api/pincode/route.ts so lookups don't depend on the live
-- api.postalpincode.in API, and so partner serviceable-area pickers have
-- a real browsable state -> city -> pincode/locality list.
CREATE TABLE "postal_pincodes" (
    "id" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "officeName" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "postal_pincodes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "postal_pincodes_pincode_officeName_key" ON "postal_pincodes"("pincode", "officeName");
CREATE INDEX "postal_pincodes_pincode_idx" ON "postal_pincodes"("pincode");
CREATE INDEX "postal_pincodes_state_district_idx" ON "postal_pincodes"("state", "district");
