/**
 * Partner -> My Biz Flow live support chat. Stored as BusinessRecord rows
 * under moduleSlug "support-tickets" (partner-scoped, like every other
 * module's data — see src/lib/businessRecords.ts), each row holding a full
 * message thread rather than a single one-shot message.
 *
 * Real two-way chat, not a fire-and-forget ticket form: every partner
 * message is pushed to the admin/ops Telegram chat (TELEGRAM_OPS_CHAT_ID —
 * see src/lib/env.ts) as a reply within that ticket's own Telegram thread,
 * and any reply typed back in Telegram (by a human OR by a bot script that
 * talks to the Bot API — nothing here distinguishes the two, both are just
 * "a message arrived in that chat") is matched back via
 * SupportTicketTelegramLink and appended to the SAME thread, which the
 * partner's widget polls for. See src/app/api/telegram/webhook/route.ts's
 * support-ticket reply case for the inbound half.
 */
import { prisma } from "@/lib/prisma";
import { createBusinessRecord, getBusinessRecord, updateBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { getOpsChatId } from "@/lib/platformSettings";
import { sendRawTelegramMessage } from "@/lib/telegram";

const MODULE_SLUG = "support-tickets";

export type SupportTicketStatus = "open" | "resolved";

export type SupportChatMessage = {
  from: "partner" | "support";
  text: string;
  at: string;
};

export type SupportTicketRecord = {
  id: string;
  partnerId: string;
  businessName?: string;
  messages: SupportChatMessage[];
  status: SupportTicketStatus;
  createdAt: string;
  resolvedAt: string | null;
};

function toTicket(partnerId: string, row: { recordKey: string; data: unknown; createdAt: Date }): SupportTicketRecord {
  const data = row.data as Record<string, unknown>;
  // Back-compat: a ticket created before this file supported real threads
  // only has a single `message` string — surface it as the thread's one
  // "partner" message rather than losing it.
  const messages =
    (data.messages as SupportChatMessage[] | undefined) ??
    (typeof data.message === "string" && data.message ? [{ from: "partner" as const, text: data.message, at: row.createdAt.toISOString() }] : []);
  return {
    id: row.recordKey,
    partnerId,
    businessName: typeof data.businessName === "string" ? data.businessName : undefined,
    messages,
    status: (data.status as SupportTicketStatus) ?? "open",
    createdAt: row.createdAt.toISOString(),
    resolvedAt: (data.resolvedAt as string | undefined) ?? null,
  };
}

/** This partner's current open ticket (the live chat thread), if any. */
export async function getOpenSupportTicket(partnerId: string): Promise<SupportTicketRecord | undefined> {
  const rows = await listBusinessRecords(partnerId, MODULE_SLUG);
  const open = rows.find((r) => (r["status"] ?? "open") === "open");
  if (!open) return undefined;
  return toTicket(partnerId, { recordKey: String(open["id"]), data: open, createdAt: new Date(String(open["recordCreatedAt"] ?? Date.now())) });
}

/**
 * Sends a partner's message: appends it to their current open ticket (or
 * opens a new one), and pushes it to the ops Telegram chat as a reply
 * within that ticket's own thread so the whole conversation stays visually
 * grouped there — same "one anchor, every reply threaded off it" approach
 * sendWorkorderTelegramAlert uses per-workorder.
 */
export async function sendPartnerSupportMessage(partnerId: string, businessName: string, text: string): Promise<SupportTicketRecord> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Message is required");

  let ticket = await getOpenSupportTicket(partnerId);
  const message: SupportChatMessage = { from: "partner", text: trimmed, at: new Date().toISOString() };

  if (!ticket) {
    const row = await createBusinessRecord(partnerId, MODULE_SLUG, {
      businessName,
      messages: [message],
      status: "open" satisfies SupportTicketStatus,
      resolvedAt: null,
    });
    ticket = toTicket(partnerId, { recordKey: String(row["id"]), data: row, createdAt: new Date() });
  } else {
    ticket = { ...ticket, messages: [...ticket.messages, message] };
    await updateBusinessRecord(partnerId, MODULE_SLUG, ticket.id, {
      businessName: ticket.businessName ?? businessName,
      messages: ticket.messages,
      status: ticket.status,
      resolvedAt: ticket.resolvedAt,
    });
  }

  await pushToTelegramThread(ticket, `💬 <b>${businessName}</b> (${partnerId})\n\n${trimmed}`);
  return ticket;
}

/** Finds an existing anchor message_id for this ticket's Telegram thread, if the chat is configured and one was already sent. */
async function findThreadAnchor(ticketId: string): Promise<{ chatId: string; messageId: number } | undefined> {
  const link = await prisma.supportTicketTelegramLink.findFirst({ where: { ticketId }, orderBy: { createdAt: "asc" } });
  return link ? { chatId: link.chatId, messageId: link.messageId } : undefined;
}

async function pushToTelegramThread(ticket: SupportTicketRecord, text: string): Promise<void> {
  const opsChatId = await getOpsChatId();
  if (!opsChatId) return; // not configured — the chat still works via the widget/admin page, just no Telegram side

  const anchor = await findThreadAnchor(ticket.id);
  const messageId = await sendRawTelegramMessage(opsChatId, text, anchor?.messageId);
  if (messageId) {
    await prisma.supportTicketTelegramLink.create({
      data: { chatId: opsChatId, messageId, partnerId: ticket.partnerId, ticketId: ticket.id },
    });
  }
}

/**
 * Appends a "support" (us -> partner) message — called from either the
 * Telegram webhook (a human or bot replied in the ops chat) or the admin
 * support-tickets page's own inline reply box. Both are just "someone on
 * our side replied," so they share this one function.
 *
 * When called from the webhook, pass (chatId, telegramMessageId): Telegram
 * guarantees at-least-once delivery, so a slow/timed-out response makes it
 * resend the exact same update. Reusing SupportTicketTelegramLink's
 * (chatId, messageId) unique constraint as a dedup check — inserting a row
 * for this inbound message id fails harmlessly on a retry, since one was
 * already inserted the first time — means no separate dedup table is
 * needed. Skipped entirely for the admin page's own reply box, which has
 * no Telegram message id to dedup against and isn't retried.
 */
export async function appendSupportReply(
  partnerId: string,
  ticketId: string,
  text: string,
  telegramSource?: { chatId: string; messageId: number }
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  if (telegramSource) {
    try {
      await prisma.supportTicketTelegramLink.create({
        data: { chatId: telegramSource.chatId, messageId: telegramSource.messageId, partnerId, ticketId },
      });
    } catch {
      return; // already processed this exact inbound Telegram message
    }
  }

  const existing = await getBusinessRecord(partnerId, MODULE_SLUG, ticketId);
  if (!existing) {
    console.error(`[supportTickets] cannot append reply — ticket "${ticketId}" not found for partner "${partnerId}"`);
    return;
  }
  const messages = ((existing["messages"] as SupportChatMessage[] | undefined) ?? []) as SupportChatMessage[];
  const next = [...messages, { from: "support" as const, text: trimmed, at: new Date().toISOString() }];
  await updateBusinessRecord(partnerId, MODULE_SLUG, ticketId, { ...existing, messages: next });
}

/** Resolves (partnerId, chatId, telegramMessageId) — the webhook route's lookup for an inbound Telegram reply. */
export async function findSupportTicketByReplyMessageId(chatId: string, messageId: number): Promise<{ partnerId: string; ticketId: string } | null> {
  const link = await prisma.supportTicketTelegramLink.findUnique({ where: { chatId_messageId: { chatId, messageId } } });
  return link ? { partnerId: link.partnerId, ticketId: link.ticketId } : null;
}

/** Cross-partner listing for the Super Admin support-tickets page. */
export async function listAllSupportTickets(): Promise<SupportTicketRecord[]> {
  const rows = await prisma.businessRecord.findMany({
    where: { moduleSlug: MODULE_SLUG },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => toTicket(row.partnerId, row));
}

/** Marks a ticket resolved/reopens it — the admin page's status toggle. */
export async function setSupportTicketStatus(partnerId: string, ticketId: string, status: SupportTicketStatus): Promise<void> {
  const existing = await getBusinessRecord(partnerId, MODULE_SLUG, ticketId);
  if (!existing) throw new Error(`Support ticket "${ticketId}" not found for partner "${partnerId}"`);
  await updateBusinessRecord(partnerId, MODULE_SLUG, ticketId, {
    ...existing,
    status,
    resolvedAt: status === "resolved" ? new Date().toISOString() : null,
  });
}
