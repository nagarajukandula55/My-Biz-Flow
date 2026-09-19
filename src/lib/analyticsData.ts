/**
 * Real per-partner analytics aggregation, backed directly by the generic
 * `BusinessRecord` table (see src/lib/businessRecords.ts) — replaces the
 * old hand-authored revenue trend / activity feed sample data. Uses
 * MODULE_DATA (src/lib/moduleData.ts) only for its static column
 * definitions (schema, not rows) to find each module's currency field.
 */
import { prisma } from "@/lib/prisma";
import type { Row } from "@/components/DataTable";
import type { LineSeriesPoint } from "@/components/charts/LineChartCard";
import type { BarPoint } from "@/components/charts/BarChartCard";
import type { PieSlice } from "@/components/charts/PieChartCard";
import { MODULE_DATA } from "@/lib/moduleData";
import { getModule } from "@/lib/designer/moduleRegistry";
import {
  WORKORDER_STAGES,
  type WorkorderStage,
  type StageHistoryEntry,
  computeDisplayStatus,
  computeWorkorderTat,
} from "@/lib/sample-data/service-centre";
import { listBusinessRecords } from "@/lib/businessRecords";
import { getAvailabilityByMaterial } from "@/lib/inventoryStock";
import type { ComboTrendPoint } from "@/components/charts/ComboTrendCard";

export async function computeModuleStat(
  partnerId: string,
  slug: string
): Promise<{ count: number; currencySum?: number }> {
  const columns = MODULE_DATA[slug]?.columns;
  if (!columns) return { count: 0 };
  const rows = await prisma.businessRecord.findMany({
    where: { partnerId, moduleSlug: slug },
    select: { data: true },
  });
  const currencyColumn = columns.find((c) => c.type === "currency");
  if (!currencyColumn) return { count: rows.length };
  const sum = rows.reduce((total, r) => {
    const value = (r.data as Record<string, unknown>)[currencyColumn.key];
    return total + (typeof value === "number" ? value : 0);
  }, 0);
  return { count: rows.length, currencySum: sum };
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Last 7 days of Billing totalAmount, bucketed by the record's creation day. */
export async function getRevenueTrend(partnerId: string): Promise<LineSeriesPoint[]> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 6);

  const rows = await prisma.businessRecord.findMany({
    where: { partnerId, moduleSlug: "billing", createdAt: { gte: since } },
    select: { data: true, createdAt: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    buckets.set(d.toDateString(), 0);
  }
  for (const r of rows) {
    const key = r.createdAt.toDateString();
    if (!buckets.has(key)) continue;
    const data = r.data as Record<string, unknown>;
    const amount = typeof data.totalAmount === "number" ? data.totalAmount : 0;
    buckets.set(key, (buckets.get(key) ?? 0) + amount);
  }

  return Array.from(buckets.entries()).map(([dateStr, y]) => ({
    x: DAY_LABELS[new Date(dateStr).getDay()],
    y,
  }));
}

export async function getWorkorderStatusBreakdown(partnerId: string): Promise<PieSlice[]> {
  // Reads via listBusinessRecords (React-cache()'d) rather than its own
  // prisma.businessRecord.findMany — this is the same full, unfiltered
  // "service-centre" table also read by getAnalyticsSummary/
  // getTopBrandsByWorkorderCount/getAverageTat on the same Analytics page
  // render; sharing the cached call collapses what used to be several
  // separate full-table queries into one.
  const rows = await listBusinessRecords(partnerId, "service-centre");
  const counts = new Map<WorkorderStage, number>(WORKORDER_STAGES.map((s) => [s, 0]));
  for (const r of rows) {
    const stage = WORKORDER_STAGES.includes(r["stage"] as WorkorderStage) ? (r["stage"] as WorkorderStage) : "Created";
    counts.set(stage, (counts.get(stage) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
}

/**
 * Service Centre period/volume + revenue-this-month stats for the partner
 * Dashboard — mirrors the reference vendor portal's "CRM Overview" (period
 * cards + open/closed counts), computed from this app's own BusinessRecord
 * store (service-centre.stage, billing.totalAmount), not ported/fabricated.
 * Only called when "service-centre" is one of the partner's visible modules
 * (see dashboard/page.tsx). There is no technician/assignment concept in
 * this app, so there is no workload-by-technician breakdown here either.
 */
export interface ServiceCentreOverview {
  workordersToday: number;
  workordersThisWeek: number;
  workordersThisMonth: number;
  workordersThisYear: number;
  openWorkorders: number;
  /**
   * Open (not Closed, not cancelled) AND past its own `slaDate` (the
   * "Promised Delivery" date captured on the intake/edit form — see
   * service-centre.ts's FormFieldDef list). Jobs with no slaDate set never
   * count as overdue — there's nothing to be overdue against — rather than
   * falling back to a fabricated age heuristic.
   */
  overdueWorkorders: number;
  /** stage === "In Progress" && onHold, mirroring mapStageToMilestone()'s PART_PENDING derivation — distinct from the generic openWorkorders count above. */
  partPendingWorkorders: number;
  /** stage === "Completed" (repair done, not yet Closed/handed over) and not cancelled. */
  repairCompletedWorkorders: number;
  /** All-time cancelledAt-set count (terminal side-branch, see mapStageToMilestone). */
  cancelledWorkorders: number;
  closedThisMonth: number;
  revenueThisMonth: number;
}

export async function getServiceCentreOverview(partnerId: string): Promise<ServiceCentreOverview> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [workorders, billingRowsThisMonth] = await Promise.all([
    prisma.businessRecord.findMany({
      where: { partnerId, moduleSlug: "service-centre" },
      select: { data: true, createdAt: true },
    }),
    prisma.businessRecord.findMany({
      where: { partnerId, moduleSlug: "billing", createdAt: { gte: startOfMonth } },
      select: { data: true },
    }),
  ]);

  let workordersToday = 0;
  let workordersThisWeek = 0;
  let workordersThisMonth = 0;
  let workordersThisYear = 0;
  let openWorkorders = 0;
  let overdueWorkorders = 0;
  let partPendingWorkorders = 0;
  let repairCompletedWorkorders = 0;
  let cancelledWorkorders = 0;
  let closedThisMonth = 0;

  for (const r of workorders) {
    const data = r.data as Record<string, unknown>;
    const stage = WORKORDER_STAGES.includes(data.stage as WorkorderStage) ? (data.stage as WorkorderStage) : "Created";
    if (r.createdAt >= startOfToday) workordersToday++;
    if (r.createdAt >= startOfWeek) workordersThisWeek++;
    if (r.createdAt >= startOfMonth) workordersThisMonth++;
    if (r.createdAt >= startOfYear) workordersThisYear++;
    // A cancelled job is terminal (see cancelWorkorderAction) — it is not open work.
    const cancelled = Boolean(data.cancelledAt);
    if (cancelled) cancelledWorkorders++;
    const isOpen = stage !== "Closed" && !cancelled;
    if (isOpen) {
      openWorkorders++;
      const slaDate = typeof data.slaDate === "string" ? new Date(data.slaDate) : null;
      if (slaDate && !Number.isNaN(slaDate.getTime()) && slaDate < now) overdueWorkorders++;
    }
    const onHold = Boolean(data.onHold);
    if (stage === "In Progress" && onHold && !cancelled) partPendingWorkorders++;
    if (stage === "Completed" && !cancelled) repairCompletedWorkorders++;
    if (stage === "Closed" && r.createdAt >= startOfMonth) closedThisMonth++;
  }

  // Revenue = money actually COLLECTED, not money invoiced. This summed
  // `totalAmount` over every invoice regardless of payment status, so a
  // Draft/unpaid invoice (which is what a non-warranty workorder used to
  // produce by default) counted as revenue the business had never received.
  // `amountPaid` is maintained on every invoice — by the manual Billing
  // form, and by createInvoiceFromWorkorderAction's handover payment
  // capture — so summing it reports real collections. Invoices predating
  // that field fall back to their total only when explicitly marked Paid.
  const revenueThisMonth = billingRowsThisMonth.reduce((total, r) => {
    const data = r.data as Record<string, unknown>;
    if (typeof data.amountPaid === "number") return total + data.amountPaid;
    if (data.paymentStatus === "Paid" && typeof data.totalAmount === "number") return total + data.totalAmount;
    return total;
  }, 0);

  return {
    workordersToday,
    workordersThisWeek,
    workordersThisMonth,
    workordersThisYear,
    openWorkorders,
    overdueWorkorders,
    partPendingWorkorders,
    repairCompletedWorkorders,
    cancelledWorkorders,
    closedThisMonth,
    revenueThisMonth,
  };
}

export interface PnaOverview {
  /** Still needs sourcing, no stock anywhere yet. */
  open: number;
  /** Open, but the real Stock ledger now shows something available for it — actionable right now. */
  availableNow: number;
  /** A Part Order was raised from this entry (see raisePartOrdersFromPnaAction) — awaiting receipt, not just sitting untouched. */
  ordered: number;
  fulfilled: number;
}

/** Same counts the Parts Not Available page's own summary cards show — kept in one place so the Dashboard card and that page's cards can never disagree. */
export async function getPnaOverview(partnerId: string): Promise<PnaOverview> {
  const [rows, availability] = await Promise.all([
    listBusinessRecords(partnerId, "service-centre-pna"),
    getAvailabilityByMaterial(partnerId),
  ]);
  let open = 0;
  let availableNow = 0;
  let ordered = 0;
  let fulfilled = 0;
  for (const r of rows) {
    const status = r["status"];
    if (status === "Open") {
      open++;
      const code = String(r["materialId"] ?? "").split(" — ")[0].trim();
      if (availability.get(code)) availableNow++;
    } else if (status === "Ordered") {
      ordered++;
    } else if (status === "Fulfilled") {
      fulfilled++;
    }
  }
  return { open, availableNow, ordered, fulfilled };
}

export interface PnaReport {
  totalOpen: number;
  totalQty: number;
  /** Pre-formatted plain-text lines, one per distinct material, ready to drop into the Telegram pna_report template's {{lines}} token. */
  lines: string;
}

/**
 * Groups every Open PNA entry by material (not one line per workorder —
 * the same part needed on three different jobs shows as one line with the
 * combined qty, since that's how staff actually go source it) and looks up
 * each material's Brand/Model from its BOM catalog record when it has one,
 * so the Telegram report is immediately actionable without anyone having
 * to cross-reference Inventory separately.
 */
export async function computePnaTelegramReport(partnerId: string): Promise<PnaReport> {
  const [pnaRows, bomRows] = await Promise.all([
    listBusinessRecords(partnerId, "service-centre-pna"),
    listBusinessRecords(partnerId, "inventory-bom"),
  ]);
  const bomByCode = new Map(bomRows.map((r) => [String(r["id"]), r]));

  const open = pnaRows.filter((r) => r["status"] === "Open");
  const byMaterial = new Map<string, { name: string; qty: number; brand: string; model: string }>();
  for (const r of open) {
    const code = String(r["materialCode"] ?? String(r["materialId"] ?? "").split(" — ")[0]).trim();
    const name = String(r["materialName"] ?? "").trim();
    const qty = Number(r["qty"] ?? 0);
    const bom = bomByCode.get(code);
    const existing = byMaterial.get(code) ?? {
      name: name || String(bom?.["description"] ?? ""),
      qty: 0,
      brand: String(bom?.["brandName"] ?? "").trim(),
      model: String(bom?.["modelName"] ?? "").trim(),
    };
    existing.qty += qty;
    byMaterial.set(code, existing);
  }

  const lines = Array.from(byMaterial.entries())
    .sort((a, b) => b[1].qty - a[1].qty)
    .map(([code, m]) => {
      const namePart = m.name ? ` — ${m.name}` : "";
      const bm = [m.brand, m.model].filter(Boolean).join(" / ");
      const bmPart = bm ? ` (${bm})` : "";
      return `${code}${namePart}${bmPart}: ${m.qty} needed`;
    })
    .join("\n");

  return {
    totalOpen: open.length,
    totalQty: open.reduce((sum, r) => sum + Number(r["qty"] ?? 0), 0),
    lines: lines || "Nothing pending — all clear.",
  };
}

export interface InquiryOverview {
  open: number;
  converted: number;
  closed: number;
  total: number;
  /** Conversion rate over inquiries that have actually been resolved (Converted + Closed) — an all-Open inbox reads as 0%, not 100%. */
  conversionRatePercent: number;
}

/**
 * Inquiry funnel summary — same store as getServiceCentreOverview
 * ("service-centre-inquiry" is Inquiry's own moduleSlug, distinct from
 * "service-centre" which is the Workorder table), counted by status
 * rather than time-bucketed since the standardised close-reason dropdown
 * (see INQUIRY_CLOSE_REASONS) is what actually earns a useful dashboard
 * summary here, not a Today/Week/Month split.
 */
export async function getInquiryOverview(partnerId: string): Promise<InquiryOverview> {
  const inquiries = await prisma.businessRecord.findMany({
    where: { partnerId, moduleSlug: "service-centre-inquiry" },
    select: { data: true },
  });

  let open = 0;
  let converted = 0;
  let closed = 0;
  for (const r of inquiries) {
    const status = (r.data as Record<string, unknown>).status;
    if (status === "Converted") converted++;
    else if (status === "Closed") closed++;
    else open++;
  }

  const resolved = converted + closed;
  const conversionRatePercent = resolved > 0 ? Math.round((converted / resolved) * 100) : 0;

  return { open, converted, closed, total: inquiries.length, conversionRatePercent };
}

/**
 * Today / This Week (Sunday-start) / This Month / This Year revenue —
 * same "money actually collected" definition as every other revenue figure
 * in this file (amountPaid if present, else totalAmount when
 * paymentStatus === "Paid"). All four are derived from one shared query
 * (every Billing record created since the start of this year) rather than
 * four separate round-trips, since the year range already covers every
 * other bucket.
 */
export interface RevenueBreakdown {
  today: number;
  thisWeek: number;
  thisMonth: number;
  thisYear: number;
}

export async function getRevenueBreakdown(partnerId: string): Promise<RevenueBreakdown> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const rows = await prisma.businessRecord.findMany({
    where: { partnerId, moduleSlug: "billing", createdAt: { gte: startOfYear } },
    select: { data: true, createdAt: true },
  });

  let today = 0;
  let thisWeek = 0;
  let thisMonth = 0;
  let thisYear = 0;
  for (const r of rows) {
    const data = r.data as Record<string, unknown>;
    let amount = 0;
    if (typeof data.amountPaid === "number") amount = data.amountPaid;
    else if (data.paymentStatus === "Paid" && typeof data.totalAmount === "number") amount = data.totalAmount;
    if (amount === 0) continue;
    thisYear += amount;
    if (r.createdAt >= startOfMonth) thisMonth += amount;
    if (r.createdAt >= startOfWeek) thisWeek += amount;
    if (r.createdAt >= startOfToday) today += amount;
  }

  return { today, thisWeek, thisMonth, thisYear };
}

/**
 * Telecalling call-attempt count this month — the "calls" business stat the
 * partner dashboard shows for partners with the Telecalling module enabled
 * (src/lib/telecalling/callsData.ts's Call model, one row per logged call
 * attempt). Only meaningful when Telecalling is enabled, so the dashboard
 * only queries/shows this when that module is visible for the partner.
 */
export async function getCallsThisMonth(partnerId: string): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return prisma.call.count({ where: { partnerId, createdAt: { gte: startOfMonth } } });
}

export const recentActivityColumns = [
  { key: "module", label: "Module", type: "text" as const },
  { key: "event", label: "Event", type: "text" as const },
  { key: "amount", label: "Amount", type: "currency" as const },
  { key: "timestamp", label: "When", type: "date" as const },
];

/** Most recently created records across a partner's enabled modules, newest first. */
export async function getRecentActivity(partnerId: string, moduleSlugs: string[], limit = 8): Promise<Row[]> {
  const rows = await prisma.businessRecord.findMany({
    where: { partnerId, moduleSlug: { in: moduleSlugs } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Look up each distinct module once (not once per row) — getModule() is
  // itself now cached (see moduleAppearance.ts), but there's no reason to
  // re-resolve the same handful of modules `limit` times over.
  const uniqueSlugs = Array.from(new Set(rows.map((r) => r.moduleSlug)));
  const moduleLabelBySlug = new Map(
    await Promise.all(uniqueSlugs.map(async (slug) => [slug, (await getModule(slug))?.label ?? slug] as const))
  );

  return rows.map((r) => {
    const columns = MODULE_DATA[r.moduleSlug]?.columns ?? [];
    const currencyColumn = columns.find((c) => c.type === "currency");
    const data = r.data as Record<string, unknown>;
    const amount = currencyColumn && typeof data[currencyColumn.key] === "number" ? (data[currencyColumn.key] as number) : 0;
    return {
      module: moduleLabelBySlug.get(r.moduleSlug) ?? r.moduleSlug,
      event: `${r.recordKey} created`,
      amount,
      timestamp: r.createdAt.toISOString().slice(0, 10),
    };
  });
}

/**
 * Daily/Weekly/Monthly/Yearly year-on-date comparison (this period vs. the
 * same period exactly one calendar year earlier) — mirrors the reference
 * vendor Analytics page's comparison view (api/analytics/trend there),
 * reimplemented against this app's own BusinessRecord store rather than
 * ported. Bucket counts/units match that reference exactly (30 days / 12
 * weeks / 12 months / 5 years) so the comparison window is a deliberate,
 * documented choice, not arbitrary:
 *   - Revenue = Billing revenue actually collected (same `amountPaid`
 *     definition getServiceCentreOverview's revenueThisMonth uses).
 *   - Workorders = every service-centre record created in the bucket,
 *     regardless of status (matches getServiceCentreOverview's period
 *     cards, which also count all statuses).
 * The prior-year range is the current range shifted back by exactly one
 * calendar year (via setFullYear), not a fixed 365-day offset, so bucket
 * boundaries still line up across a leap year.
 */
export type PeriodGranularity = "DAY" | "WEEK" | "MONTH" | "YEAR";

export interface PeriodBucket {
  label: string;
  revenue: number;
  workorders: number;
  priorYearRevenue: number;
  priorYearWorkorders: number;
}

export interface PeriodComparison {
  daily: PeriodBucket[];
  weekly: PeriodBucket[];
  monthly: PeriodBucket[];
  yearly: PeriodBucket[];
}

const BUCKET_COUNT: Record<PeriodGranularity, number> = { DAY: 30, WEEK: 12, MONTH: 12, YEAR: 5 };

function alignToMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay(); // Sun=0..Sat=6
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfBucketRange(granularity: PeriodGranularity, now: Date): Date {
  const count = BUCKET_COUNT[granularity];
  const start = new Date(now);
  if (granularity === "DAY") start.setDate(start.getDate() - (count - 1));
  else if (granularity === "WEEK") start.setDate(start.getDate() - (count - 1) * 7);
  else if (granularity === "MONTH") start.setMonth(start.getMonth() - (count - 1), 1);
  else start.setFullYear(start.getFullYear() - (count - 1), 0, 1);
  start.setHours(0, 0, 0, 0);
  return granularity === "WEEK" ? alignToMonday(start) : start;
}

function bucketLabel(granularity: PeriodGranularity, d: Date): string {
  if (granularity === "DAY") return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  if (granularity === "WEEK") return `Wk of ${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`;
  if (granularity === "MONTH") return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  return String(d.getFullYear());
}

function bucketKey(granularity: PeriodGranularity, d: Date): string {
  if (granularity === "YEAR") return String(d.getFullYear());
  if (granularity === "MONTH") return `${d.getFullYear()}-${d.getMonth()}`;
  return alignToBucketStart(granularity, d).toISOString().slice(0, 10);
}

function alignToBucketStart(granularity: PeriodGranularity, d: Date): Date {
  if (granularity === "WEEK") return alignToMonday(d);
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function shiftYears(d: Date, years: number): Date {
  const copy = new Date(d);
  copy.setFullYear(copy.getFullYear() + years);
  return copy;
}

async function fetchPeriodSeries(
  partnerId: string,
  granularity: PeriodGranularity,
  rangeStart: Date,
  rangeEnd: Date
): Promise<{ revenueByKey: Map<string, number>; workordersByKey: Map<string, number> }> {
  const [billingRows, workorderRows] = await Promise.all([
    prisma.businessRecord.findMany({
      where: { partnerId, moduleSlug: "billing", createdAt: { gte: rangeStart, lte: rangeEnd } },
      select: { data: true, createdAt: true },
    }),
    prisma.businessRecord.findMany({
      where: { partnerId, moduleSlug: "service-centre", createdAt: { gte: rangeStart, lte: rangeEnd } },
      select: { createdAt: true },
    }),
  ]);

  const revenueByKey = new Map<string, number>();
  for (const r of billingRows) {
    const data = r.data as Record<string, unknown>;
    let amount = 0;
    if (typeof data.amountPaid === "number") amount = data.amountPaid;
    else if (data.paymentStatus === "Paid" && typeof data.totalAmount === "number") amount = data.totalAmount;
    if (amount === 0) continue;
    const key = bucketKey(granularity, alignToBucketStart(granularity, r.createdAt));
    revenueByKey.set(key, (revenueByKey.get(key) ?? 0) + amount);
  }

  const workordersByKey = new Map<string, number>();
  for (const r of workorderRows) {
    const key = bucketKey(granularity, alignToBucketStart(granularity, r.createdAt));
    workordersByKey.set(key, (workordersByKey.get(key) ?? 0) + 1);
  }

  return { revenueByKey, workordersByKey };
}

async function getPeriodBuckets(partnerId: string, granularity: PeriodGranularity, now: Date): Promise<PeriodBucket[]> {
  const currentStart = startOfBucketRange(granularity, now);
  const priorStart = shiftYears(currentStart, -1);
  const priorEnd = shiftYears(now, -1);

  const [current, prior] = await Promise.all([
    fetchPeriodSeries(partnerId, granularity, currentStart, now),
    fetchPeriodSeries(partnerId, granularity, priorStart, priorEnd),
  ]);

  const count = BUCKET_COUNT[granularity];
  const buckets: PeriodBucket[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(currentStart);
    if (granularity === "DAY") d.setDate(d.getDate() + i);
    else if (granularity === "WEEK") d.setDate(d.getDate() + i * 7);
    else if (granularity === "MONTH") d.setMonth(d.getMonth() + i, 1);
    else d.setFullYear(d.getFullYear() + i, 0, 1);

    const key = bucketKey(granularity, d);
    const priorD = shiftYears(d, -1);
    const priorKey = bucketKey(granularity, priorD);

    buckets.push({
      label: bucketLabel(granularity, d),
      revenue: current.revenueByKey.get(key) ?? 0,
      workorders: current.workordersByKey.get(key) ?? 0,
      priorYearRevenue: prior.revenueByKey.get(priorKey) ?? 0,
      priorYearWorkorders: prior.workordersByKey.get(priorKey) ?? 0,
    });
  }
  return buckets;
}

export async function getPeriodComparison(partnerId: string): Promise<PeriodComparison> {
  const now = new Date();
  const [daily, weekly, monthly, yearly] = await Promise.all([
    getPeriodBuckets(partnerId, "DAY", now),
    getPeriodBuckets(partnerId, "WEEK", now),
    getPeriodBuckets(partnerId, "MONTH", now),
    getPeriodBuckets(partnerId, "YEAR", now),
  ]);
  return { daily, weekly, monthly, yearly };
}

/**
 * Revenue by Source. This app has no cross-module invoice-origin field
 * (unlike the reference vendor app's `sourceOrderId`, which tags an
 * invoice as POS- or CRM-issued), so "source" here means the one real,
 * always-populated field every Billing record actually carries that
 * plausibly answers "where did this money come in through": `paymentMode`
 * (Cash/UPI/Bank Transfer/Cheque, see billing.ts). Documented choice, not
 * a fabricated dimension — every value plotted is real revenue actually
 * collected (same amountPaid/Paid-totalAmount definition used elsewhere
 * in this file), grouped by a field that already exists on every record.
 */
export async function getRevenueBySource(partnerId: string): Promise<PieSlice[]> {
  // Shares the cached listBusinessRecords(partnerId, "billing") call with
  // getInvoiceStatusBreakdown/getAnalyticsSummary below — same full,
  // unfiltered "billing" table, same partner, same request.
  const rows = await listBusinessRecords(partnerId, "billing");
  const byMode = new Map<string, number>();
  for (const r of rows) {
    let amount = 0;
    if (typeof r["amountPaid"] === "number") amount = r["amountPaid"] as number;
    else if (r["paymentStatus"] === "Paid" && typeof r["totalAmount"] === "number") amount = r["totalAmount"] as number;
    if (amount === 0) continue;
    const mode = typeof r["paymentMode"] === "string" && r["paymentMode"] ? (r["paymentMode"] as string) : "Unspecified";
    byMode.set(mode, (byMode.get(mode) ?? 0) + amount);
  }
  return Array.from(byMode.entries()).map(([name, value]) => ({ name, value }));
}

/**
 * Top-of-page summary numbers for the Analytics page — mirrors the
 * reference vendor app's 6 summary cards (Total Revenue, This Month,
 * Invoices, Total/Open/Closed Workorders). Revenue uses the same
 * amountPaid/Paid-totalAmount "money actually collected" definition as
 * every other revenue figure in this file. Workorder Open/Closed counts
 * reuse computeDisplayStatus() — the SAME milestone computation the
 * Workorders list page (service-centre/page.tsx) uses for its own Open/
 * Closed stat cards — via listBusinessRecords (which returns the same Row
 * shape that page reads), so these numbers can never disagree with the
 * Workorders list's own cards. Closed excludes Cancelled, per that same
 * page's documented rule.
 */
export interface AnalyticsSummary {
  totalRevenue: number;
  paidInvoiceCount: number;
  thisMonthRevenue: number;
  thisMonthInvoiceCount: number;
  totalInvoices: number;
  totalWorkorders: number;
  openWorkorders: number;
  closedWorkorders: number;
}

export async function getAnalyticsSummary(partnerId: string): Promise<AnalyticsSummary> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [billingRows, workorderRows] = await Promise.all([
    listBusinessRecords(partnerId, "billing"),
    listBusinessRecords(partnerId, "service-centre"),
  ]);

  let totalRevenue = 0;
  let paidInvoiceCount = 0;
  let thisMonthRevenue = 0;
  let thisMonthInvoiceCount = 0;
  for (const r of billingRows) {
    let amount = 0;
    if (typeof r["amountPaid"] === "number") amount = r["amountPaid"] as number;
    else if (r["paymentStatus"] === "Paid" && typeof r["totalAmount"] === "number") amount = r["totalAmount"] as number;
    if (amount > 0) {
      totalRevenue += amount;
      paidInvoiceCount++;
    }
    if (new Date(r["recordCreatedAt"] as string) >= startOfMonth) {
      thisMonthInvoiceCount++;
      if (amount > 0) thisMonthRevenue += amount;
    }
  }

  let openWorkorders = 0;
  let closedWorkorders = 0;
  for (const row of workorderRows) {
    const { milestone } = computeDisplayStatus(row);
    if (milestone === "CLOSED") closedWorkorders++;
  }
  const cancelledWorkorders = workorderRows.filter((row) => computeDisplayStatus(row).milestone === "CANCELLED").length;
  openWorkorders = workorderRows.length - closedWorkorders - cancelledWorkorders;

  return {
    totalRevenue,
    paidInvoiceCount,
    thisMonthRevenue,
    thisMonthInvoiceCount,
    totalInvoices: billingRows.length,
    totalWorkorders: workorderRows.length,
    openWorkorders,
    closedWorkorders,
  };
}

const TREND_MONTH_LABELS = (d: Date) => d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

/** Combined revenue + workorder-count trend for the last 6 calendar months (this month inclusive). */
export async function getSixMonthTrend(partnerId: string): Promise<ComboTrendPoint[]> {
  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [billingRows, workorderRows] = await Promise.all([
    prisma.businessRecord.findMany({
      where: { partnerId, moduleSlug: "billing", createdAt: { gte: rangeStart } },
      select: { data: true, createdAt: true },
    }),
    prisma.businessRecord.findMany({
      where: { partnerId, moduleSlug: "service-centre", createdAt: { gte: rangeStart } },
      select: { createdAt: true },
    }),
  ]);

  const months: { key: string; label: string; revenue: number; workorders: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: TREND_MONTH_LABELS(d), revenue: 0, workorders: 0 });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));

  for (const r of billingRows) {
    const key = `${r.createdAt.getFullYear()}-${r.createdAt.getMonth()}`;
    const bucket = byKey.get(key);
    if (!bucket) continue;
    const data = r.data as Record<string, unknown>;
    let amount = 0;
    if (typeof data.amountPaid === "number") amount = data.amountPaid;
    else if (data.paymentStatus === "Paid" && typeof data.totalAmount === "number") amount = data.totalAmount;
    bucket.revenue += amount;
  }
  for (const r of workorderRows) {
    const key = `${r.createdAt.getFullYear()}-${r.createdAt.getMonth()}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.workorders++;
  }

  return months.map((m) => ({ x: m.label, revenue: m.revenue, workorders: m.workorders }));
}

/** Every Billing record (any status), counted by `paymentStatus` — real invoice-status composition, not scoped to paid-only. */
export async function getInvoiceStatusBreakdown(partnerId: string): Promise<PieSlice[]> {
  const rows = await listBusinessRecords(partnerId, "billing");
  const byStatus = new Map<string, number>();
  for (const r of rows) {
    const status = typeof r["paymentStatus"] === "string" && r["paymentStatus"] ? (r["paymentStatus"] as string) : "Draft";
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
  }
  return Array.from(byStatus.entries()).map(([name, value]) => ({ name, value }));
}

/**
 * Top device brands by workorder count (data.brandName on service-centre
 * records — see service-centre.ts's intake form). Blank/unset brand is
 * excluded rather than lumped into an "Unspecified" bucket — a bar chart
 * about brand mix shouldn't be dominated by "nobody filled this in".
 * Capped to the top 8 so the bar chart stays readable.
 */
export async function getTopBrandsByWorkorderCount(partnerId: string): Promise<BarPoint[]> {
  const rows = await listBusinessRecords(partnerId, "service-centre");
  const byBrand = new Map<string, number>();
  for (const r of rows) {
    const brand = typeof r["brandName"] === "string" ? (r["brandName"] as string).trim() : "";
    if (!brand) continue;
    byBrand.set(brand, (byBrand.get(brand) ?? 0) + 1);
  }
  return Array.from(byBrand.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([category, value]) => ({ category, value }));
}

export interface AverageTat {
  /** Average TAT (hours) across CLOSED workorders only — an in-progress job's TAT is still running, so mixing it in would understate the real number and drift downward as new jobs get created. */
  avgHours?: number;
  closedCount: number;
}

/** Average turnaround time for completed jobs — reuses computeWorkorderTat(), the same single source of truth the Workorders list/detail pages use for their own per-row TAT badge. */
export async function getAverageTat(partnerId: string): Promise<AverageTat> {
  const rows = await listBusinessRecords(partnerId, "service-centre");

  let total = 0;
  let closedCount = 0;
  for (const r of rows) {
    const stageHistory = (r["stageHistory"] as StageHistoryEntry[] | undefined) ?? [];
    const isClosed = stageHistory.some((h) => h.stage === "Closed");
    if (!isClosed) continue;
    const { hours } = computeWorkorderTat({
      recordCreatedAt: r["recordCreatedAt"] as string,
      receivedDate: typeof r["receivedDate"] === "string" ? (r["receivedDate"] as string) : undefined,
      stageHistory,
      cancelledAt: typeof r["cancelledAt"] === "string" ? (r["cancelledAt"] as string) : undefined,
      terminal: true,
    });
    if (hours !== undefined) {
      total += hours;
      closedCount++;
    }
  }
  return { avgHours: closedCount > 0 ? total / closedCount : undefined, closedCount };
}
