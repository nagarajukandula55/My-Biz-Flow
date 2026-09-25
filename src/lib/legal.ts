/**
 * Prisma-backed data access for the Legal module's real models
 * (LegalClient, LegalMatter, LegalCourtDate, LegalDocument — see
 * prisma/schema.prisma). Replaces the earlier BusinessRecord-backed matter
 * store (src/lib/sample-data/legal.ts's legalRows/legalColumns/
 * legalFormFields are still used by the old detail-field-grid helpers where
 * convenient, but matter data itself now lives in these real tables).
 *
 * Tenant scoping follows src/lib/tenant.ts's convention: every read/write
 * takes partnerId and filters/asserts by it — see assertPartnerScope().
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerScope } from "@/lib/tenant";
import { getNextNumber } from "@/lib/designer/numbering";
import { sendPartnerTelegramAlert } from "@/lib/telegram";
import { getPartner } from "@/lib/partnerData";
import { legalMatterStatusChangedMessage } from "@/lib/telegramTemplates";
import { sendLegalMatterStatusChangedEmail } from "@/lib/email/moduleEmails";

export const LEGAL_MATTER_STATUSES = ["Open", "InProgress", "OnHold", "Closed"] as const;
export type LegalMatterStatus = (typeof LEGAL_MATTER_STATUSES)[number];

// --- Clients -----------------------------------------------------------

export type LegalClientRecord = {
  id: string;
  partnerId: string;
  name: string;
  contact: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
};

function toClientRecord(row: {
  id: string;
  partnerId: string;
  name: string;
  contact: string | null;
  email: string | null;
  address: string | null;
  createdAt: Date;
}): LegalClientRecord {
  return {
    id: row.id,
    partnerId: row.partnerId,
    name: row.name,
    contact: row.contact,
    email: row.email,
    address: row.address,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listLegalClients(partnerId: string): Promise<LegalClientRecord[]> {
  const rows = await prisma.legalClient.findMany({ where: { partnerId }, orderBy: { createdAt: "desc" } });
  return rows.map(toClientRecord);
}

export async function getLegalClient(partnerId: string, id: string): Promise<LegalClientRecord | null> {
  const row = await prisma.legalClient.findUnique({ where: { id } });
  if (!row) return null;
  assertPartnerScope(partnerId, row.partnerId);
  return toClientRecord(row);
}

export async function createLegalClient(
  partnerId: string,
  input: { name: string; contact?: string; email?: string; address?: string }
): Promise<LegalClientRecord> {
  const row = await prisma.legalClient.create({
    data: {
      partnerId,
      name: input.name,
      contact: input.contact || null,
      email: input.email || null,
      address: input.address || null,
    },
  });
  return toClientRecord(row);
}

export async function updateLegalClient(
  partnerId: string,
  id: string,
  input: { name: string; contact?: string; email?: string; address?: string }
): Promise<LegalClientRecord> {
  const existing = await prisma.legalClient.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  const row = await prisma.legalClient.update({
    where: { id },
    data: {
      name: input.name,
      contact: input.contact || null,
      email: input.email || null,
      address: input.address || null,
    },
  });
  return toClientRecord(row);
}

export async function deleteLegalClient(partnerId: string, id: string): Promise<void> {
  const existing = await prisma.legalClient.findUnique({ where: { id } });
  if (!existing) return;
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.legalClient.delete({ where: { id } });
}

// --- Matters -------------------------------------------------------------

export type LegalMatterRecord = {
  id: string;
  partnerId: string;
  clientId: string;
  clientName: string;
  matterNumber: string;
  title: string;
  matterType: string | null;
  status: LegalMatterStatus;
  openedDate: string;
  closedDate: string | null;
};

function toMatterRecord(row: {
  id: string;
  partnerId: string;
  clientId: string;
  client: { name: string };
  matterNumber: string;
  title: string;
  matterType: string | null;
  status: string;
  openedDate: Date;
  closedDate: Date | null;
}): LegalMatterRecord {
  return {
    id: row.id,
    partnerId: row.partnerId,
    clientId: row.clientId,
    clientName: row.client.name,
    matterNumber: row.matterNumber,
    title: row.title,
    matterType: row.matterType,
    status: row.status as LegalMatterStatus,
    openedDate: row.openedDate.toISOString().slice(0, 10),
    closedDate: row.closedDate ? row.closedDate.toISOString().slice(0, 10) : null,
  };
}

export async function listLegalMatters(partnerId: string): Promise<LegalMatterRecord[]> {
  const rows = await prisma.legalMatter.findMany({
    where: { partnerId },
    include: { client: { select: { name: true } } },
    orderBy: { openedDate: "desc" },
  });
  return rows.map(toMatterRecord);
}

export async function getLegalMatter(partnerId: string, id: string): Promise<LegalMatterRecord | null> {
  const row = await prisma.legalMatter.findUnique({ where: { id }, include: { client: { select: { name: true } } } });
  if (!row) return null;
  assertPartnerScope(partnerId, row.partnerId);
  return toMatterRecord(row);
}

/**
 * Creates a matter with an auto-generated sequential matterNumber, via this
 * repo's shared getNextNumber() (documentType key "legal.matter") — the
 * same mechanism invoice/workorder numbers use, configurable per-partner
 * from Settings > Numbering. Falls back to a plain "MTR"-prefixed 4-digit
 * sequence when nothing has been configured for this document type.
 */
export async function createLegalMatter(
  partnerId: string,
  input: { clientId: string; title: string; matterType?: string; status?: LegalMatterStatus; openedDate?: string }
): Promise<LegalMatterRecord> {
  const client = await prisma.legalClient.findUniqueOrThrow({ where: { id: input.clientId } });
  assertPartnerScope(partnerId, client.partnerId);

  const matterNumber = await getNextNumber("legal.matter", partnerId, {
    prefix: "MTR",
    separator: "-",
    sequenceDigits: 4,
  });

  const row = await prisma.legalMatter.create({
    data: {
      partnerId,
      clientId: input.clientId,
      matterNumber,
      title: input.title,
      matterType: input.matterType || null,
      status: input.status ?? "Open",
      openedDate: input.openedDate ? new Date(input.openedDate) : new Date(),
    },
    include: { client: { select: { name: true } } },
  });
  return toMatterRecord(row);
}

/**
 * Updates a matter's editable fields. When `status` changes, fires the
 * "legalMatterStatusChanged" Telegram alert (best-effort, never throws —
 * see sendPartnerTelegramAlert) and stamps closedDate when moving to
 * "Closed" (clearing it on any move away from Closed).
 */
export async function updateLegalMatter(
  partnerId: string,
  id: string,
  input: { clientId?: string; title?: string; matterType?: string; status?: LegalMatterStatus; openedDate?: string }
): Promise<LegalMatterRecord> {
  const existing = await prisma.legalMatter.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);

  const statusChanged = input.status !== undefined && input.status !== existing.status;
  const closedDate =
    input.status === "Closed" ? existing.closedDate ?? new Date() : input.status !== undefined ? null : undefined;

  const row = await prisma.legalMatter.update({
    where: { id },
    data: {
      clientId: input.clientId,
      title: input.title,
      matterType: input.matterType !== undefined ? input.matterType || null : undefined,
      status: input.status,
      openedDate: input.openedDate ? new Date(input.openedDate) : undefined,
      closedDate,
    },
    include: { client: { select: { name: true, email: true } } },
  });

  if (statusChanged) {
    (async () => {
      const partner = await getPartner(partnerId);
      if (!partner) return;
      const message = await legalMatterStatusChangedMessage({
        partnerBusinessName: partner.businessName,
        matterNumber: row.matterNumber,
        title: row.title,
        prevStatus: existing.status,
        nextStatus: row.status,
      });
      await sendPartnerTelegramAlert(partnerId, "legalMatterStatusChanged", message);
      // Email only if the client has a real email on file — LegalClient.email is optional.
      if (row.client.email) {
        await sendLegalMatterStatusChangedEmail({
          to: row.client.email,
          partnerBusinessName: partner.businessName,
          matterNumber: row.matterNumber,
          title: row.title,
          prevStatus: existing.status,
          nextStatus: row.status,
        });
      }
    })().catch(() => {
      // Best-effort — never block the status update on a notification failure.
    });
  }

  return toMatterRecord(row);
}

// --- Court dates -----------------------------------------------------------

export type LegalCourtDateRecord = {
  id: string;
  matterId: string;
  hearingDate: string;
  court: string | null;
  purpose: string | null;
  outcome: string | null;
};

function toCourtDateRecord(row: {
  id: string;
  matterId: string;
  hearingDate: Date;
  court: string | null;
  purpose: string | null;
  outcome: string | null;
}): LegalCourtDateRecord {
  return {
    id: row.id,
    matterId: row.matterId,
    hearingDate: row.hearingDate.toISOString().slice(0, 10),
    court: row.court,
    purpose: row.purpose,
    outcome: row.outcome,
  };
}

export async function listLegalCourtDates(partnerId: string, matterId: string): Promise<LegalCourtDateRecord[]> {
  const matter = await prisma.legalMatter.findUniqueOrThrow({ where: { id: matterId } });
  assertPartnerScope(partnerId, matter.partnerId);
  const rows = await prisma.legalCourtDate.findMany({ where: { matterId }, orderBy: { hearingDate: "asc" } });
  return rows.map(toCourtDateRecord);
}

/**
 * Adds a court date. Alert type "legalCourtDateUpcoming" is registered (see
 * src/lib/telegram.ts's TELEGRAM_ALERT_TYPES) for a future scheduled-job
 * reminder — no cron exists in this repo to check "N days before
 * hearingDate" on a recurring basis, so nothing is sent live from here.
 * Wiring a real reminder needs a scheduled job (e.g. a new
 * /api/cron/legal-court-date-reminders route polling upcoming
 * LegalCourtDate rows), left for a follow-up pass.
 */
export async function addLegalCourtDate(
  partnerId: string,
  matterId: string,
  input: { hearingDate: string; court?: string; purpose?: string; outcome?: string }
): Promise<LegalCourtDateRecord> {
  const matter = await prisma.legalMatter.findUniqueOrThrow({ where: { id: matterId } });
  assertPartnerScope(partnerId, matter.partnerId);
  const row = await prisma.legalCourtDate.create({
    data: {
      matterId,
      hearingDate: new Date(input.hearingDate),
      court: input.court || null,
      purpose: input.purpose || null,
      outcome: input.outcome || null,
    },
  });
  return toCourtDateRecord(row);
}

// --- Documents (metadata only) --------------------------------------------

export type LegalDocumentRecord = {
  id: string;
  matterId: string;
  title: string;
  documentType: string | null;
  uploadedAt: string;
};

function toDocumentRecord(row: {
  id: string;
  matterId: string;
  title: string;
  documentType: string | null;
  uploadedAt: Date;
}): LegalDocumentRecord {
  return {
    id: row.id,
    matterId: row.matterId,
    title: row.title,
    documentType: row.documentType,
    uploadedAt: row.uploadedAt.toISOString(),
  };
}

export async function listLegalDocuments(partnerId: string, matterId: string): Promise<LegalDocumentRecord[]> {
  const matter = await prisma.legalMatter.findUniqueOrThrow({ where: { id: matterId } });
  assertPartnerScope(partnerId, matter.partnerId);
  const rows = await prisma.legalDocument.findMany({ where: { matterId }, orderBy: { uploadedAt: "desc" } });
  return rows.map(toDocumentRecord);
}

/** Records document METADATA only — see LegalDocument's schema comment: there
 * is no file-storage pipeline in this app yet, so nothing is actually
 * uploaded/stored here beyond title/type/timestamp. */
export async function addLegalDocument(
  partnerId: string,
  matterId: string,
  input: { title: string; documentType?: string }
): Promise<LegalDocumentRecord> {
  const matter = await prisma.legalMatter.findUniqueOrThrow({ where: { id: matterId } });
  assertPartnerScope(partnerId, matter.partnerId);
  const row = await prisma.legalDocument.create({
    data: {
      matterId,
      title: input.title,
      documentType: input.documentType || null,
    },
  });
  return toDocumentRecord(row);
}
