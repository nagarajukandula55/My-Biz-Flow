/**
 * Partner → AN Group support tickets. Stored as BusinessRecord rows under
 * moduleSlug "support-tickets" (partner-scoped, like every other module's
 * data — see src/lib/businessRecords.ts) rather than a new Prisma model, to
 * stay consistent with how the rest of the app persists module data.
 *
 * Minimal, real (no AI/bot): a partner types a message, it's saved; a Super
 * Admin can see it and every partner's tickets across the whole platform
 * from /admin/support-tickets and mark it resolved. Replying inline is a
 * follow-up (see that admin page's header note) — this pass ships the real
 * partner-facing submit half plus a real admin read/resolve view, matching
 * AN-CRM's SupportTicket model's actual shape (message thread + status)
 * without porting its AI-less ticket UI 1:1.
 */
import { prisma } from "@/lib/prisma";
import { createBusinessRecord, getBusinessRecord, updateBusinessRecord } from "@/lib/businessRecords";

const MODULE_SLUG = "support-tickets";

export type SupportTicketStatus = "open" | "resolved";

export type SupportTicketRecord = {
  id: string;
  partnerId: string;
  message: string;
  status: SupportTicketStatus;
  createdAt: string;
  resolvedAt: string | null;
};

function toTicket(partnerId: string, row: { recordKey: string; data: unknown; createdAt: Date }): SupportTicketRecord {
  const data = row.data as Record<string, unknown>;
  return {
    id: row.recordKey,
    partnerId,
    message: String(data.message ?? ""),
    status: (data.status as SupportTicketStatus) ?? "open",
    createdAt: row.createdAt.toISOString(),
    resolvedAt: (data.resolvedAt as string | undefined) ?? null,
  };
}

/** Creates a new support ticket for a partner — the floating "Support" widget's submit action. */
export async function createSupportTicket(partnerId: string, message: string): Promise<void> {
  const trimmed = message.trim();
  if (!trimmed) throw new Error("Message is required");
  await createBusinessRecord(partnerId, MODULE_SLUG, {
    message: trimmed,
    status: "open" satisfies SupportTicketStatus,
    resolvedAt: null,
  });
}

/**
 * Cross-partner listing for the Super Admin support-tickets page — every
 * other BusinessRecord read is partner-scoped (listBusinessRecords), but a
 * Super Admin needs to see every partner's tickets in one place, so this
 * queries the table directly without a partnerId filter (same shape as
 * listAllAccessKeys in src/lib/designer/accessKeys.ts).
 */
export async function listAllSupportTickets(): Promise<SupportTicketRecord[]> {
  const rows = await prisma.businessRecord.findMany({
    where: { moduleSlug: MODULE_SLUG },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => toTicket(row.partnerId, row));
}

/** Marks a ticket resolved/reopens it — the admin page's status toggle. */
export async function setSupportTicketStatus(
  partnerId: string,
  ticketId: string,
  status: SupportTicketStatus
): Promise<void> {
  // updateBusinessRecord replaces the whole `data` JSON blob rather than
  // merging, so the existing row must be read first and spread — otherwise
  // this would wipe out `message` (see updateBusinessRecord in
  // src/lib/businessRecords.ts).
  const existing = await getBusinessRecord(partnerId, MODULE_SLUG, ticketId);
  if (!existing) throw new Error(`Support ticket "${ticketId}" not found for partner "${partnerId}"`);
  await updateBusinessRecord(partnerId, MODULE_SLUG, ticketId, {
    ...existing,
    status,
    resolvedAt: status === "resolved" ? new Date().toISOString() : null,
  });
}
