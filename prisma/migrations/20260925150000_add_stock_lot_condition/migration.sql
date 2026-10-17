-- Changed from a bare ADD COLUMN to IF NOT EXISTS: this migration's folder
-- name (20260925150000) sorts BEFORE 20260925145000_recreate_orphaned_shared_tables
-- even though it was actually applied to production a day earlier (Sept 25
-- vs Sept 26) — that later recovery migration recreated stock_lots already
-- including this column (captured from the live table's state at the time),
-- so a fresh replay of migration history in folder order (what `prisma
-- migrate dev`'s shadow database does) hits "column already exists" on this
-- statement. IF NOT EXISTS makes it a true no-op in that replay without
-- changing what already happened on the real, already-migrated database.
ALTER TABLE "stock_lots" ADD COLUMN IF NOT EXISTS "condition" TEXT;
