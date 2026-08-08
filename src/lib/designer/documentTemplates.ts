/**
 * Document template store — lets a Super Admin design a record's printable
 * document (Invoice, Job Card, Receipt, etc.) from the Designer, using
 * {{fieldKey}} placeholders instead of a hardcoded layout per module.
 *
 * Backed by the `DocumentTemplate` Prisma table (see prisma/schema.prisma).
 * Was a JSON-file store; migrated to Postgres with the same function
 * names/behavior, now async to match Prisma's I/O.
 */

import { prisma } from "@/lib/prisma";

export { renderTemplate } from "./renderTemplate";

export async function getDocumentTemplate(pageId: string): Promise<string | undefined> {
  const row = await prisma.documentTemplate.findUnique({ where: { pageId } });
  return row?.htmlTemplate;
}

export async function saveDocumentTemplate(pageId: string, htmlTemplate: string): Promise<void> {
  await prisma.documentTemplate.upsert({
    where: { pageId },
    create: { pageId, htmlTemplate },
    update: { htmlTemplate },
  });
}
