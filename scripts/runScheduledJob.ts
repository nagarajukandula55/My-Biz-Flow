/**
 * Executes an existing scheduled-job route inside a GitHub Actions runner.
 * This deliberately reuses the production job handlers, so moving a job off
 * Vercel does not change business rules or touch existing records differently.
 *
 * Usage: npx tsx scripts/runScheduledJob.ts <job-key>
 */
import { prisma } from "../src/lib/prisma";

const jobs = {
  "payment-delivery": () => import("../src/app/api/cron/payment-delivery/route"),
  "field-force-offer-retry": () => import("../src/app/api/cron/field-force-offer-retry/route"),
  "field-force-sla-monitor": () => import("../src/app/api/cron/field-force-sla-monitor/route"),
  "workflow-actions": () => import("../src/app/api/cron/workflow-actions/route"),
  "event-starting-soon": () => import("../src/app/api/cron/event-starting-soon/route"),
  "legal-court-date-reminders": () => import("../src/app/api/cron/legal-court-date-reminders/route"),
  "overdue-invoice-automations": () => import("../src/app/api/cron/overdue-invoice-automations/route"),
  "low-stock-automations": () => import("../src/app/api/cron/low-stock-automations/route"),
  "billing-recurring-invoices": () => import("../src/app/api/cron/billing-recurring-invoices/route"),
  "telegram-reports": () => import("../src/app/api/cron/telegram-reports/route"),
  "subscription-expiry-check": () => import("../src/app/api/cron/subscription-expiry-check/route"),
} as const;

type JobKey = keyof typeof jobs;
type RouteModule = {
  GET?: (request: Request) => Promise<Response>;
  POST?: (request: Request) => Promise<Response>;
};

async function main() {
  const key = process.argv[2] as JobKey | undefined;
  if (!key || !(key in jobs)) {
    throw new Error(`Choose one job: ${Object.keys(jobs).join(", ")}`);
  }
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET is required in the GitHub Actions environment.");

  const route = (await jobs[key]()) as RouteModule;
  const handler = key === "workflow-actions" ? route.POST : route.GET;
  if (!handler) throw new Error(`No handler exported for ${key}`);

  const response = await handler(new Request(`https://github-worker.local/api/cron/${key}`, {
    method: key === "workflow-actions" ? "POST" : "GET",
    headers: { Authorization: `Bearer ${secret}` },
  }));
  const body = await response.text();
  console.log(`[scheduled-job] ${key}: ${response.status} ${body}`);
  if (!response.ok) process.exitCode = 1;
}

main()
  .catch(error => {
    console.error("[scheduled-job] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
