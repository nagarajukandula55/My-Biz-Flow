-- Idempotent throughout — same reasoning as the previous POS migration
-- (20260921130000_add_pos_account_staff): applied by hand against this
-- sandbox's direct-connection-restricted network before it could be
-- marked applied via the normal `prisma migrate deploy` flow.

-- CreateTable
CREATE TABLE IF NOT EXISTS "pos_till_sessions" (
    "id" TEXT NOT NULL,
    "posAccountId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "openedByStaffId" TEXT NOT NULL,
    "openingFloat" INTEGER NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedByStaffId" TEXT,
    "countedCash" INTEGER,
    "expectedCash" INTEGER,
    "variance" INTEGER,
    "closedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Open',
    "notes" TEXT,

    CONSTRAINT "pos_till_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pos_till_sessions_posAccountId_locationId_status_idx" ON "pos_till_sessions"("posAccountId", "locationId", "status");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pos_till_sessions_posAccountId_fkey') THEN
    ALTER TABLE "pos_till_sessions" ADD CONSTRAINT "pos_till_sessions_posAccountId_fkey"
      FOREIGN KEY ("posAccountId") REFERENCES "pos_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pos_till_sessions_openedByStaffId_fkey') THEN
    ALTER TABLE "pos_till_sessions" ADD CONSTRAINT "pos_till_sessions_openedByStaffId_fkey"
      FOREIGN KEY ("openedByStaffId") REFERENCES "pos_staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pos_till_sessions_closedByStaffId_fkey') THEN
    ALTER TABLE "pos_till_sessions" ADD CONSTRAINT "pos_till_sessions_closedByStaffId_fkey"
      FOREIGN KEY ("closedByStaffId") REFERENCES "pos_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
