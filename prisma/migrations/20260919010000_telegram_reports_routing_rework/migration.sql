-- Telegram alerts rework:
--   1. Business reports (daily+weekly+monthly, ALL THREE, no single pick-one
--      cadence) are now sent to every partner with a connected chat, no
--      per-partner on/off. `reportFrequency` (NONE/DAILY/WEEKLY/MONTHLY) is
--      gone -- report delivery now goes through the same routing map as
--      every other alert type (key "report").
--   2. The separate enable/disable checkbox per alert type is gone --
--      `enabledTypes` is gone. Every type is always "on"; a partner only
--      ever picks its routing, and "none" is now a valid routing value
--      (the replacement for "disabled"). Existing rows are migrated here:
--      any TELEGRAM_ALERT_TYPES key NOT present in the old `enabledTypes`
--      array gets `routing[key] = "none"`; a key that WAS enabled keeps
--      whatever routing it already had (implicitly "both" if unset, so no
--      explicit write needed for that case).
--   3. `lastReportSentAt` becomes a per-cadence map (DAILY/WEEKLY/MONTHLY
--      each fire independently now, so a single "sent today" timestamp can
--      no longer gate all three -- e.g. every Saturday DAILY and WEEKLY are
--      both due the same run). Existing single timestamp is carried over
--      into all three cadence keys so no partner gets an immediate
--      duplicate-looking send the day this deploys.

-- Step 2: seed "none" into routing for every previously-disabled alert type.
UPDATE "telegram_settings" ts
SET "routing" = (
  SELECT jsonb_object_agg(k, val)
  FROM (
    SELECT
      coalesce(ts."routing", '{}'::jsonb) AS base
  ) _base,
  LATERAL (
    SELECT key AS k, value AS val FROM jsonb_each(base)
    UNION ALL
    SELECT k, '"none"'::jsonb
    FROM unnest(ARRAY[
      'newWorkorder','workorderClosed','workorderCancelled','paymentReceived',
      'paymentDue','lowStock','subscriptionExpiring','generalAnnouncement'
    ]) AS k
    WHERE NOT (base ? k)
      AND NOT (coalesce(ts."enabledTypes", '[]'::jsonb) @> to_jsonb(k::text))
  ) merged
);

-- Step 3: fold the old single lastReportSentAt into a per-cadence map.
ALTER TABLE "telegram_settings" ADD COLUMN "lastReportSentAtByCadence" JSONB NOT NULL DEFAULT '{}';

UPDATE "telegram_settings"
SET "lastReportSentAtByCadence" = jsonb_build_object(
  'DAILY', to_jsonb("lastReportSentAt"),
  'WEEKLY', to_jsonb("lastReportSentAt"),
  'MONTHLY', to_jsonb("lastReportSentAt")
)
WHERE "lastReportSentAt" IS NOT NULL;

ALTER TABLE "telegram_settings" DROP COLUMN "lastReportSentAt";
ALTER TABLE "telegram_settings" RENAME COLUMN "lastReportSentAtByCadence" TO "lastReportSentAt";

-- Step 1 + 2 cleanup: drop the now-unused columns.
ALTER TABLE "telegram_settings" DROP COLUMN "reportFrequency";
ALTER TABLE "telegram_settings" DROP COLUMN "enabledTypes";
