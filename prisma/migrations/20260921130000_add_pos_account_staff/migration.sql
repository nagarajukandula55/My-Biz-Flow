-- Idempotent throughout: applied by hand against this sandbox's
-- direct-connection-restricted network before it could be run/marked via
-- the normal `prisma migrate deploy` flow — IF NOT EXISTS / DO $$ guards
-- keep a real replay (e.g. the next Vercel build) a safe no-op either way.

-- CreateTable
CREATE TABLE IF NOT EXISTS "pos_accounts" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "outletName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "pos_staff" (
    "id" TEXT NOT NULL,
    "posAccountId" TEXT NOT NULL,
    "staffCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'Cashier',
    "passwordHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "pos_accounts_partnerId_key" ON "pos_accounts"("partnerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pos_accounts_partnerId_idx" ON "pos_accounts"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "pos_staff_staffCode_key" ON "pos_staff"("staffCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pos_staff_posAccountId_idx" ON "pos_staff"("posAccountId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pos_staff_posAccountId_fkey'
  ) THEN
    ALTER TABLE "pos_staff" ADD CONSTRAINT "pos_staff_posAccountId_fkey"
      FOREIGN KEY ("posAccountId") REFERENCES "pos_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
