-- Supports bounded dashboard/report reads ordered by newest record.
CREATE INDEX IF NOT EXISTS "business_records_partnerId_moduleSlug_createdAt_idx"
  ON "business_records" ("partnerId", "moduleSlug", "createdAt");
