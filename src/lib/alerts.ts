/**
 * In-app alerts for a partner — computed, never stored.
 *
 * WHY COMPUTED AND NOT A TABLE
 * ----------------------------
 * The obvious move is to reuse the existing `Notification` Prisma model,
 * but that model is Field-Force-specific in a way that doesn't survive
 * borrowing: it maps to `field_force_notifications`, its index is
 * (partnerId, audience, recipientId) where audience is
 * "ops | customer | provider", and it carries `relatedBookingId` — a
 * Booking FK-by-convention that a Service Centre alert has no value for.
 * Writing Service Centre rows into it with audience "ops" would surface
 * them inside Field Force's own ops notification list. So it is left
 * alone.
 *
 * Nothing is persisted for these alerts either. Every alert below is
 * derived from the partner's real current BusinessRecords at render time,
 * which has two properties worth keeping:
 *   - an alert cannot go stale or lie (restock an item and the low-stock
 *     alert is simply gone on the next render — there is no row to
 *     reconcile, no "mark as resolved" job to write),
 *   - there is no seeded or fabricated alert content anywhere; if a
 *     partner's data is empty, they correctly see zero alerts.
 *
 * The message copy intentionally matches the vocabulary already used in
 * src/lib/telegramTemplates.ts ("low stock", "workorder", "payment") so
 * that if a real delivery channel is ever wired up, the two are talking
 * about the same events rather than inventing a second vocabulary.
 */
import { listBusinessRecords } from "@/lib/businessRecords";
import type { Row } from "@/components/DataTable";

export type AlertSeverity = "danger" | "warning" | "info";

export type Alert = {
  /** Stable within a render — derived from the source record, not random. */
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  /** Path relative to /partner/[partnerId]/ that resolves the alert. */
  href: string;
};

/** A workorder sitting in a mid-repair state longer than this needs a look. */
const STALE_WORKORDER_DAYS = 7;

/** Workorder statuses that represent "still on the bench" (see
 *  serviceCentreFormFields' status options in sample-data/service-centre.ts). */
const OPEN_WORKORDER_STATUSES = new Set(["Diagnosed", "In repair", "On hold"]);

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toDate(value: unknown): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

function str(row: Row, key: string): string {
  return String(row[key] ?? "").trim();
}

/**
 * Every alert for a partner, most severe first. `now` is injectable so the
 * age thresholds are testable and so a single render uses one consistent
 * clock across all four checks.
 */
export async function computeAlerts(partnerId: string, now: Date = new Date()): Promise<Alert[]> {
  const [stock, workorders, invoices, profiles] = await Promise.all([
    listBusinessRecords(partnerId, "inventory-stock"),
    listBusinessRecords(partnerId, "service-centre"),
    listBusinessRecords(partnerId, "billing"),
    listBusinessRecords(partnerId, "service-centre-sc-profile"),
  ]);

  const alerts: Alert[] = [];

  // 1. Low stock — qtyOnHand at or below the item's own reorderLevel.
  //    Both fields must actually be numeric on the record; an item with no
  //    reorder level set has not opted in to this and is skipped rather
  //    than assigned a made-up threshold.
  for (const item of stock) {
    const qty = toNumber(item["qtyOnHand"]);
    const reorder = toNumber(item["reorderLevel"]);
    if (qty === null || reorder === null) continue;
    if (qty > reorder) continue;
    const code = str(item, "id");
    alerts.push({
      id: `low-stock:${code}`,
      severity: qty <= 0 ? "danger" : "warning",
      title: qty <= 0 ? "Out of stock" : "Low stock",
      detail: `${str(item, "materialId") || code} — ${qty} on hand, reorder level ${reorder}.`,
      href: `inventory/stock`,
    });
  }

  // 2. Workorders stuck on the bench — still in an open repair state more
  //    than STALE_WORKORDER_DAYS after the date they were received.
  // 3. SLA breach — a promised delivery date (slaDate) already in the past
  //    on a workorder that hasn't been delivered. Checked in the same pass
  //    since both read the same record; SLA wins when both apply, because
  //    a missed promise to a customer outranks an internal ageing rule.
  for (const wo of workorders) {
    const status = str(wo, "status");
    if (!OPEN_WORKORDER_STATUSES.has(status)) continue;
    const code = str(wo, "id");
    const customer = str(wo, "customer") || str(wo, "customerName");

    const sla = toDate(wo["slaDate"]);
    if (sla && sla.getTime() < now.getTime()) {
      const late = daysBetween(sla, now);
      alerts.push({
        id: `sla-breach:${code}`,
        severity: "danger",
        title: "Promised delivery date missed",
        detail: `${code}${customer ? ` (${customer})` : ""} was promised ${late} day${late === 1 ? "" : "s"} ago and is still "${status}".`,
        href: `service-centre/${encodeURIComponent(code)}`,
      });
      continue;
    }

    const received = toDate(wo["receivedDate"]);
    if (!received) continue;
    const age = daysBetween(received, now);
    if (age < STALE_WORKORDER_DAYS) continue;
    alerts.push({
      id: `stale-workorder:${code}`,
      severity: "warning",
      title: "Workorder open too long",
      detail: `${code}${customer ? ` (${customer})` : ""} has been "${status}" for ${age} days.`,
      href: `service-centre/${encodeURIComponent(code)}`,
    });
  }

  // 4. Overdue invoices — past the due date with money still outstanding.
  //    amountDue is the authoritative field (paymentStatus is a label a
  //    partner can set by hand; amountDue is what the line items actually
  //    compute to), so a partially-paid overdue invoice still alerts.
  for (const inv of invoices) {
    const due = toDate(inv["dueDate"]);
    if (!due || due.getTime() >= now.getTime()) continue;
    const amountDue = toNumber(inv["amountDue"]);
    if (amountDue === null || amountDue <= 0) continue;
    const code = str(inv, "id");
    const late = daysBetween(due, now);
    alerts.push({
      id: `overdue-invoice:${code}`,
      severity: late >= 30 ? "danger" : "warning",
      title: "Invoice overdue",
      detail: `${code}${str(inv, "customer") ? ` (${str(inv, "customer")})` : ""} — ₹${amountDue.toLocaleString("en-IN")} unpaid, ${late} day${late === 1 ? "" : "s"} past due.`,
      href: `billing/${encodeURIComponent(code)}`,
    });
  }

  // 5. Sub-centre records pointing at a parent that doesn't exist — the
  //    same orphan condition the Sub-Centres page already surfaces on its
  //    own screen, raised here so it's noticed without going looking.
  const profileIds = new Set(profiles.map((p) => str(p, "id")));
  for (const p of profiles) {
    const parentId = str(p, "parentScId");
    if (!parentId || profileIds.has(parentId)) continue;
    const code = str(p, "id");
    alerts.push({
      id: `orphan-sub-sc:${code}`,
      severity: "info",
      title: "Sub-centre has no parent",
      detail: `${str(p, "centreName") || code} lists parent "${parentId}", which is not an existing service centre profile.`,
      href: `service-centre/sub-scs`,
    });
  }

  const order: Record<AlertSeverity, number> = { danger: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => order[a.severity] - order[b.severity] || a.id.localeCompare(b.id));
  return alerts;
}
