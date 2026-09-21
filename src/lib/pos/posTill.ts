/**
 * Till/cash-drawer sessions — open with a counted starting float, close
 * with a physical cash count reconciled against what the system expects.
 * A sale can only be rung up while its outlet has an Open session (see
 * requireOpenTillSession, called from checkout) — this is what makes "cash
 * in the drawer" an auditable, reconciled number instead of just trusting
 * whatever the register shows.
 */
import { prisma } from "@/lib/prisma";
import { listBusinessRecords } from "@/lib/businessRecords";

/** The one Open session for this outlet, if any — enforced in application code (openTillSession refuses a second Open session for the same outlet), not a DB constraint, since Postgres can't uniquely index "the row where status = Open" without a partial index this generic schema doesn't have. */
export async function getOpenTillSession(posAccountId: string, locationId: string) {
  return prisma.posTillSession.findFirst({
    where: { posAccountId, locationId, status: "Open" },
    orderBy: { openedAt: "desc" },
    include: { openedByStaff: true },
  });
}

/** Checkout's own gate — thrown, not redirected, since this runs inside a Server Action (completeSaleAction), not a page. */
export async function requireOpenTillSession(posAccountId: string, locationId: string) {
  const session = await getOpenTillSession(posAccountId, locationId);
  if (!session) {
    throw new Error("No till is open at this outlet — open one from POS > Till before ringing up a sale.");
  }
  return session;
}

export async function openTillSession(input: {
  posAccountId: string;
  locationId: string;
  openedByStaffId: string;
  openingFloat: number;
}) {
  const existing = await getOpenTillSession(input.posAccountId, input.locationId);
  if (existing) {
    throw new Error(`A till is already open at this outlet (opened ${existing.openedAt.toISOString()}) — close it before opening another.`);
  }
  return prisma.posTillSession.create({
    data: {
      posAccountId: input.posAccountId,
      locationId: input.locationId,
      openedByStaffId: input.openedByStaffId,
      openingFloat: Math.round(input.openingFloat),
    },
  });
}

/**
 * Expected cash = opening float + every Cash-tender amount from Completed
 * sales rung up during this session (matched by `posTillSessionId` stamped
 * on the sale at checkout — see completeSaleAction) minus Cash refunded on
 * any Voided sale from this same session. Variance = counted - expected;
 * negative means cash is short, positive means over.
 */
export async function computeExpectedCash(partnerId: string, session: { id: string; openingFloat: number }): Promise<number> {
  const sales = await listBusinessRecords(partnerId, "pos");
  let cashTotal = 0;
  for (const sale of sales) {
    if (sale["posTillSessionId"] !== session.id) continue;
    const tenders = Array.isArray(sale["tenders"]) ? (sale["tenders"] as { method: string; amount: number }[]) : [];
    const cashInSale = tenders.filter((t) => t.method === "Cash").reduce((sum, t) => sum + Number(t.amount || 0), 0);
    if (sale["status"] === "Voided") {
      // A Voided Cash sale gives its cash back out of the drawer.
      cashTotal -= cashInSale;
    } else {
      cashTotal += cashInSale;
    }
  }
  return session.openingFloat + cashTotal;
}

export async function closeTillSession(input: {
  partnerId: string;
  sessionId: string;
  closedByStaffId: string;
  countedCash: number;
  notes?: string;
}) {
  const session = await prisma.posTillSession.findUnique({ where: { id: input.sessionId } });
  if (!session) throw new Error("Till session not found.");
  if (session.status !== "Open") throw new Error("This till session is already closed.");

  const expectedCash = await computeExpectedCash(input.partnerId, session);
  const countedCash = Math.round(input.countedCash);
  const variance = countedCash - expectedCash;

  return prisma.posTillSession.update({
    where: { id: input.sessionId },
    data: {
      status: "Closed",
      closedByStaffId: input.closedByStaffId,
      countedCash,
      expectedCash,
      variance,
      closedAt: new Date(),
      notes: input.notes || null,
    },
  });
}
