-- Additive distributor/dealer lifecycle improvements. Existing customer,
-- order and line records are preserved; new columns are nullable/defaulted.
ALTER TABLE "wholesale_customers"
  ADD COLUMN "email" TEXT,
  ADD COLUMN "addressLine" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" TEXT,
  ADD COLUMN "pincode" TEXT,
  ADD COLUMN "defaultPriceTierId" TEXT,
  ADD COLUMN "referredByCustomerId" TEXT,
  ADD COLUMN "referralCode" TEXT;

ALTER TABLE "wholesale_customers"
  ADD CONSTRAINT "wholesale_customers_defaultPriceTierId_fkey"
    FOREIGN KEY ("defaultPriceTierId") REFERENCES "price_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "wholesale_customers_referredByCustomerId_fkey"
    FOREIGN KEY ("referredByCustomerId") REFERENCES "wholesale_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "wholesale_customers_partnerId_referralCode_key" ON "wholesale_customers"("partnerId", "referralCode");
CREATE INDEX "wholesale_customers_referredByCustomerId_idx" ON "wholesale_customers"("referredByCustomerId");
ALTER TABLE "wholesale_orders"
  ADD COLUMN "subtotalAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "taxAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'Distributor',
  ADD COLUMN "requestedByDealerPartnerId" TEXT,
  ADD COLUMN "warehouseId" TEXT,
  ADD COLUMN "warehouseName" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "shippedAt" TIMESTAMP(3),
  ADD COLUMN "deliveredAt" TIMESTAMP(3),
  ADD COLUMN "receivedAt" TIMESTAMP(3);

UPDATE "wholesale_orders" SET "status" = CASE
  WHEN "status" = 'Pending' THEN 'Requested'
  WHEN "status" = 'Confirmed' THEN 'Processing'
  WHEN "status" = 'Dispatched' THEN 'Shipped'
  ELSE "status"
END;
ALTER TABLE "wholesale_orders" ALTER COLUMN "status" SET DEFAULT 'Requested';
CREATE TABLE "wholesale_payments" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "method" TEXT NOT NULL,
  "reference" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wholesale_payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wholesale_payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "wholesale_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "wholesale_payments_partnerId_orderId_receivedAt_idx" ON "wholesale_payments"("partnerId", "orderId", "receivedAt");

ALTER TABLE "wholesale_order_lines"
  ADD COLUMN "productId" TEXT,
  ADD COLUMN "gstRateBps" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "allocatedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "pickedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "shippedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "receivedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "serialNumbers" JSONB,
  ADD COLUMN "serialLotIds" JSONB;

CREATE TABLE "wholesale_products" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'unit',
  "listPrice" INTEGER NOT NULL,
  "gstRateBps" INTEGER NOT NULL DEFAULT 0,
  "minimumQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "inventoryMaterialId" TEXT,
  "barcode" TEXT,
  "serialized" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "wholesale_products_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "wholesale_products_partnerId_sku_key" ON "wholesale_products"("partnerId", "sku");
CREATE INDEX "wholesale_products_partnerId_isActive_name_idx" ON "wholesale_products"("partnerId", "isActive", "name");
ALTER TABLE "wholesale_order_lines"
  ADD CONSTRAINT "wholesale_order_lines_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "wholesale_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "wholesale_order_events" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "actorType" TEXT NOT NULL,
  "actorId" TEXT,
  "note" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wholesale_order_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wholesale_order_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "wholesale_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "wholesale_order_events_partnerId_orderId_createdAt_idx" ON "wholesale_order_events"("partnerId", "orderId", "createdAt");

CREATE TABLE "wholesale_referral_programs" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "rewardAmount" INTEGER NOT NULL DEFAULT 0,
  "rewardPercentBps" INTEGER NOT NULL DEFAULT 500,
  "dealerPartnerTypeId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "wholesale_referral_programs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "wholesale_referral_programs_partnerId_key" ON "wholesale_referral_programs"("partnerId");

CREATE TABLE "distributor_dealer_relationships" (
  "id" TEXT NOT NULL,
  "distributorPartnerId" TEXT NOT NULL,
  "dealerPartnerId" TEXT NOT NULL,
  "wholesaleCustomerId" TEXT NOT NULL,
  "referrerCustomerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'Active',
  CONSTRAINT "distributor_dealer_relationships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "distributor_dealer_relationships_distributorPartnerId_fkey" FOREIGN KEY ("distributorPartnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "distributor_dealer_relationships_dealerPartnerId_fkey" FOREIGN KEY ("dealerPartnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "distributor_dealer_relationships_wholesaleCustomerId_fkey" FOREIGN KEY ("wholesaleCustomerId") REFERENCES "wholesale_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "distributor_dealer_relationships_dealerPartnerId_key" ON "distributor_dealer_relationships"("dealerPartnerId");
CREATE UNIQUE INDEX "distributor_dealer_relationships_wholesaleCustomerId_key" ON "distributor_dealer_relationships"("wholesaleCustomerId");
CREATE UNIQUE INDEX "distributor_dealer_relationships_distributorPartnerId_wholesaleCustomerId_key" ON "distributor_dealer_relationships"("distributorPartnerId", "wholesaleCustomerId");
CREATE INDEX "distributor_dealer_relationships_distributorPartnerId_status_createdAt_idx" ON "distributor_dealer_relationships"("distributorPartnerId", "status", "createdAt");

CREATE TABLE "wholesale_referral_rewards" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "referrerCustomerId" TEXT,
  "recipientType" TEXT NOT NULL DEFAULT 'Dealer',
  "recipientPartnerId" TEXT,
  "referredCustomerId" TEXT NOT NULL,
  "qualifyingOrderId" TEXT,
  "qualifyingSubscriptionPaymentId" TEXT,
  "rewardPercentBps" INTEGER NOT NULL DEFAULT 500,
  "qualifyingSubscriptionAmount" INTEGER,
  "rewardAmount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'Pending',
  "qualifiedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "payoutReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wholesale_referral_rewards_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wholesale_referral_rewards_referrerCustomerId_fkey" FOREIGN KEY ("referrerCustomerId") REFERENCES "wholesale_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "wholesale_referral_rewards_referredCustomerId_fkey" FOREIGN KEY ("referredCustomerId") REFERENCES "wholesale_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "wholesale_referral_rewards_referredCustomerId_key" ON "wholesale_referral_rewards"("referredCustomerId");
CREATE INDEX "wholesale_referral_rewards_partnerId_status_createdAt_idx" ON "wholesale_referral_rewards"("partnerId", "status", "createdAt");
CREATE INDEX "wholesale_referral_rewards_referrerCustomerId_idx" ON "wholesale_referral_rewards"("referrerCustomerId");
