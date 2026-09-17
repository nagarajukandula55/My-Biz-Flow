-- Idempotency guard for the new /api/cron/telegram-reports scheduled job --
-- Vercel Cron doesn't guarantee exactly-once delivery, so without this a
-- partner could get the same daily/weekly/monthly digest twice.
ALTER TABLE "telegram_settings" ADD COLUMN "lastReportSentAt" TIMESTAMP(3);
