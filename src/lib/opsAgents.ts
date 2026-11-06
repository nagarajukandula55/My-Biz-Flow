export type OpsAgent = { id: string; name: string; purpose: string; schedule: string; source: string; telegram: boolean; safety: string };

/** Deterministic operational monitors. These are rules/jobs, not AI agents. */
export const OPS_AGENTS: readonly OpsAgent[] = [
  { id: "cron-health", name: "Cron health monitor", purpose: "Verifies scheduled endpoints respond with authenticated success during the 10:00–19:00 IST operating window.", schedule: "Every 15 minutes, 10:00–19:00 IST", source: ".github/workflows/cron.yml", telegram: true, safety: "Read-only and secret-gated" },
  { id: "backup-health", name: "Backup monitor", purpose: "Checks backup freshness, completion and row-count anomalies.", schedule: "After every backup", source: ".github/workflows/db-backup.yml", telegram: true, safety: "Read-only comparison" },
  { id: "delivery-queue", name: "Delivery queue monitor", purpose: "Finds failed or review-required email, accounting and Telegram deliveries during the 10:00–19:00 IST operating window.", schedule: "Every 15 minutes, 10:00–19:00 IST", source: "src/lib/paymentDeliveryQueue.ts", telegram: true, safety: "Never retries accepted jobs" },
  { id: "provider-readiness", name: "Provider readiness monitor", purpose: "Reports missing partner/provider configuration without exposing secrets.", schedule: "Daily at 10:30 IST", source: "src/lib/providerReadiness.ts", telegram: true, safety: "Metadata only" },
  { id: "error-log", name: "Error trend monitor", purpose: "Groups new application errors and reports repeated failures during the 10:00–19:00 IST operating window.", schedule: "Every 15 minutes, 10:00–19:00 IST", source: "src/lib/errorLog.ts", telegram: true, safety: "Read-only" },
  { id: "security-boundary", name: "Security boundary monitor", purpose: "Checks authentication, tenant-scope and protected-route regression signals.", schedule: "On every release", source: "tests/security.test.cjs", telegram: true, safety: "Blocks release on failure" },
  { id: "service-centre-safety", name: "Service Centre safety monitor", purpose: "Confirms protected files and preservation tests remain unchanged.", schedule: "On every release", source: "tests/service-centre-list.test.cjs", telegram: true, safety: "Read-only; no workflow writes" },
];
