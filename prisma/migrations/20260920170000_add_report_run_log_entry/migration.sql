-- Persisted history of every scheduled/manual Telegram report run (per-partner
-- digest and the platform's own growth digest) — see src/lib/reportRunLog.ts.
CREATE TABLE "report_run_log_entries" (
    "id" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "attempted" INTEGER NOT NULL,
    "sent" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_run_log_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "report_run_log_entries_cadence_createdAt_idx" ON "report_run_log_entries"("cadence", "createdAt");

-- Per-cadence last-sent stamp for the platform's own growth digest (see
-- src/lib/platformReportData.ts) — mirrors TelegramSettings.lastReportSentAt's
-- shape, just for the one platform-wide "account" instead of per-partner.
ALTER TABLE "platform_settings" ADD COLUMN "lastPlatformReportSentAt" JSONB NOT NULL DEFAULT '{}';
