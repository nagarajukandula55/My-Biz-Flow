-- Additive only: no existing table or row is modified, deleted, or truncated.
CREATE TABLE "partner_analytics_snapshots" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "moduleSlug" TEXT NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "paidCount" INTEGER NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "closedCount" INTEGER NOT NULL DEFAULT 0,
    "cancelledCount" INTEGER NOT NULL DEFAULT 0,
    "processedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "partner_analytics_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_analytics_snapshots_partnerId_moduleSlug_snapshotDate_key"
ON "partner_analytics_snapshots"("partnerId", "moduleSlug", "snapshotDate");

CREATE INDEX "partner_analytics_snapshots_partnerId_moduleSlug_snapshotDate_idx"
ON "partner_analytics_snapshots"("partnerId", "moduleSlug", "snapshotDate");

CREATE TABLE "partner_analytics_backfill_jobs" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "moduleSlug" TEXT NOT NULL,
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "cursorCreatedAt" TIMESTAMP(3),
    "cursorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rowsProcessed" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "partner_analytics_backfill_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_analytics_backfill_jobs_partnerId_moduleSlug_sourceVersion_key"
ON "partner_analytics_backfill_jobs"("partnerId", "moduleSlug", "sourceVersion");

CREATE INDEX "partner_analytics_backfill_jobs_status_updatedAt_idx"
ON "partner_analytics_backfill_jobs"("status", "updatedAt");

CREATE TABLE "platform_analytics_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "snapshotReads" BOOLEAN NOT NULL DEFAULT false,
    "compareMode" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "platform_analytics_settings_pkey" PRIMARY KEY ("id")
);

-- Maintain only additive summary counters for the two high-read dashboard
-- modules. Existing business rows are never changed. The trigger is scoped to
-- these modules and uses the record creation day as the reporting bucket.
CREATE OR REPLACE FUNCTION "mbf_apply_analytics_delta"(
    p_partner_id TEXT, p_module_slug TEXT, p_snapshot_date DATE,
    p_record_delta INTEGER, p_paid_count_delta INTEGER,
    p_paid_amount_delta NUMERIC, p_closed_delta INTEGER,
    p_cancelled_delta INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO "partner_analytics_snapshots" (
    "id", "partnerId", "moduleSlug", "snapshotDate", "recordCount",
    "paidCount", "paidAmount", "closedCount", "cancelledCount",
    "createdAt", "updatedAt"
  ) VALUES (
    md5(random()::text || clock_timestamp()::text), p_partner_id,
    p_module_slug, p_snapshot_date, p_record_delta, p_paid_count_delta,
    p_paid_amount_delta, p_closed_delta, p_cancelled_delta, NOW(), NOW()
  )
  ON CONFLICT ("partnerId", "moduleSlug", "snapshotDate") DO UPDATE SET
    "recordCount" = "partner_analytics_snapshots"."recordCount" + EXCLUDED."recordCount",
    "paidCount" = "partner_analytics_snapshots"."paidCount" + EXCLUDED."paidCount",
    "paidAmount" = "partner_analytics_snapshots"."paidAmount" + EXCLUDED."paidAmount",
    "closedCount" = "partner_analytics_snapshots"."closedCount" + EXCLUDED."closedCount",
    "cancelledCount" = "partner_analytics_snapshots"."cancelledCount" + EXCLUDED."cancelledCount",
    "updatedAt" = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "mbf_business_record_analytics_trigger"() RETURNS TRIGGER AS $$
DECLARE
  old_paid NUMERIC := 0; new_paid NUMERIC := 0;
  old_paid_count INTEGER := 0; new_paid_count INTEGER := 0;
  old_closed INTEGER := 0; new_closed INTEGER := 0;
  old_cancelled INTEGER := 0; new_cancelled INTEGER := 0;
  old_day DATE; new_day DATE;
BEGIN
  -- The trigger is dormant during migration/backfill. Admin can enable it
  -- only after both module backfills are complete and reconciled.
  IF NOT EXISTS (SELECT 1 FROM "platform_analytics_settings" WHERE "id" = 'default' AND "snapshotReads" = TRUE) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP IN ('DELETE', 'UPDATE') AND OLD."moduleSlug" IN ('billing', 'service-centre') THEN
    old_day := OLD."createdAt"::date;
    IF OLD."moduleSlug" = 'billing' THEN
      IF COALESCE(OLD."data"->>'amountPaid', '') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN old_paid := (OLD."data"->>'amountPaid')::numeric;
      ELSIF OLD."data"->>'paymentStatus' = 'Paid' AND COALESCE(OLD."data"->>'totalAmount', '') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN old_paid := (OLD."data"->>'totalAmount')::numeric;
      END IF;
      IF old_paid > 0 THEN old_paid_count := 1; END IF;
    ELSE
      IF OLD."data"->>'stage' = 'Closed' OR OLD."data"->'stageHistory' @> '[{"stage":"Closed"}]'::jsonb THEN old_closed := 1; END IF;
      IF NULLIF(OLD."data"->>'cancelledAt', '') IS NOT NULL THEN old_cancelled := 1; END IF;
    END IF;
    PERFORM "mbf_apply_analytics_delta"(OLD."partnerId", OLD."moduleSlug", old_day, -1, -old_paid_count, -old_paid, -old_closed, -old_cancelled);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW."moduleSlug" IN ('billing', 'service-centre') THEN
    new_day := NEW."createdAt"::date;
    IF NEW."moduleSlug" = 'billing' THEN
      IF COALESCE(NEW."data"->>'amountPaid', '') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN new_paid := (NEW."data"->>'amountPaid')::numeric;
      ELSIF NEW."data"->>'paymentStatus' = 'Paid' AND COALESCE(NEW."data"->>'totalAmount', '') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN new_paid := (NEW."data"->>'totalAmount')::numeric;
      END IF;
      IF new_paid > 0 THEN new_paid_count := 1; END IF;
    ELSE
      IF NEW."data"->>'stage' = 'Closed' OR NEW."data"->'stageHistory' @> '[{"stage":"Closed"}]'::jsonb THEN new_closed := 1; END IF;
      IF NULLIF(NEW."data"->>'cancelledAt', '') IS NOT NULL THEN new_cancelled := 1; END IF;
    END IF;
    PERFORM "mbf_apply_analytics_delta"(NEW."partnerId", NEW."moduleSlug", new_day, 1, new_paid_count, new_paid, new_closed, new_cancelled);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "business_records_analytics_snapshot_trigger"
AFTER INSERT OR UPDATE OR DELETE ON "business_records"
FOR EACH ROW EXECUTE FUNCTION "mbf_business_record_analytics_trigger"();
