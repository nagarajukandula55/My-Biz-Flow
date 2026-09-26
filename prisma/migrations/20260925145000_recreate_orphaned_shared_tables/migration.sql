-- Recreates 4 tables (otp_codes, inventory_transactions, stock_lots,
-- material_consumption) that this session's Inventory ledger/FIFO work
-- depends on (see prisma/schema.prisma's OtpCode/InventoryTransaction/
-- StockLot/MaterialConsumption models), but whose original CREATE TABLE
-- migration was lost: it was authored in the sibling My-Biz-Flow-Admin
-- repo, then deleted there during a later cleanup (that inventory work had
-- been built in the wrong repo and was reverted), while My-Biz-Flow's own
-- schema.prisma only ever recorded a small ALTER (stock_lot_condition) on
-- top of these tables, never their original creation. Recreating them here
-- exactly as they were, since My-Biz-Flow is the repo that actually owns
-- and uses these models today. Purely additive (CREATE TABLE only) --
-- this is a genuine recovery of missing structure, not new functionality.

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "targetRecordId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otp_codes_partnerId_targetRecordId_purpose_idx" ON "otp_codes"("partnerId", "targetRecordId", "purpose");

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_transactions_partnerId_sourceRecordId_sourceType_key" ON "inventory_transactions"("partnerId", "sourceRecordId", "sourceType");

-- CreateIndex
CREATE INDEX "inventory_transactions_partnerId_occurredAt_idx" ON "inventory_transactions"("partnerId", "occurredAt");

-- CreateIndex
CREATE INDEX "inventory_transactions_partnerId_sourceRecordId_idx" ON "inventory_transactions"("partnerId", "sourceRecordId");

-- CreateTable
CREATE TABLE "stock_lots" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "warehouseName" TEXT,
    "materialId" TEXT NOT NULL,
    "materialLabel" TEXT NOT NULL,
    "serialized" BOOLEAN NOT NULL DEFAULT false,
    "serialNumber" TEXT,
    "quantityReceived" INTEGER NOT NULL,
    "quantityRemaining" INTEGER NOT NULL,
    "unitCost" INTEGER NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "sourceType" TEXT,
    "sourceRecordId" TEXT,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "condition" TEXT,

    CONSTRAINT "stock_lots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_lots_partnerId_materialId_warehouseId_receivedAt_idx" ON "stock_lots"("partnerId", "materialId", "warehouseId", "receivedAt");

-- CreateIndex
CREATE INDEX "stock_lots_partnerId_materialId_serialNumber_idx" ON "stock_lots"("partnerId", "materialId", "serialNumber");

-- CreateTable
CREATE TABLE "material_consumption" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "materialLabel" TEXT NOT NULL,
    "warehouseId" TEXT,
    "warehouseName" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "valueAmount" DOUBLE PRECISION NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_consumption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "material_consumption_partnerId_occurredAt_idx" ON "material_consumption"("partnerId", "occurredAt");

-- CreateIndex
CREATE INDEX "material_consumption_partnerId_sourceType_idx" ON "material_consumption"("partnerId", "sourceType");

-- CreateIndex
CREATE INDEX "material_consumption_partnerId_materialId_idx" ON "material_consumption"("partnerId", "materialId");
