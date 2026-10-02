/**
 * Field Force Companies — the upstream OEM/brand a bulk-uploaded batch of
 * job data belongs to (see FieldForceCompany in prisma/schema.prisma).
 * Each company remembers its own CSV column layout (`columnMapping`) so a
 * partner configures it once and every future file from that same company
 * auto-maps without re-doing the setup.
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerScope } from "@/lib/tenant";

/** Our internal field names a company's CSV columns map onto. */
export const COMPANY_UPLOAD_FIELDS = [
  "customerName",
  "customerPhone",
  "addressLine1",
  "city",
  "state",
  "pincode",
  "serviceName",
  "scheduledAt",
  "notes",
] as const;
export type CompanyUploadField = (typeof COMPANY_UPLOAD_FIELDS)[number];
/** Only these are required per row — email/landmark/notes-style extras aren't part of this set at all (kept out of the mapping target list, not optional within it). */
export const REQUIRED_COMPANY_UPLOAD_FIELDS: CompanyUploadField[] = [
  "customerName",
  "customerPhone",
  "addressLine1",
  "city",
  "state",
  "pincode",
  "serviceName",
];

export type CompanyRecord = {
  id: string;
  partnerId: string;
  name: string;
  isActive: boolean;
  /** CSV header text (as it appears in the file) -> CompanyUploadField. */
  columnMapping: Record<string, CompanyUploadField>;
  createdAt: Date;
  updatedAt: Date;
};

function toRecord(row: {
  id: string;
  partnerId: string;
  name: string;
  isActive: boolean;
  columnMapping: unknown;
  createdAt: Date;
  updatedAt: Date;
}): CompanyRecord {
  return {
    id: row.id,
    partnerId: row.partnerId,
    name: row.name,
    isActive: row.isActive,
    columnMapping: (row.columnMapping as Record<string, CompanyUploadField>) ?? {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listCompanies(partnerId: string): Promise<CompanyRecord[]> {
  const rows = await prisma.fieldForceCompany.findMany({ where: { partnerId }, orderBy: { name: "asc" } });
  return rows.map(toRecord);
}

export async function getCompany(id: string, partnerId: string): Promise<CompanyRecord | null> {
  const row = await prisma.fieldForceCompany.findUnique({ where: { id } });
  if (!row) return null;
  assertPartnerScope(partnerId, row.partnerId);
  return toRecord(row);
}

export async function createCompany(partnerId: string, name: string): Promise<CompanyRecord> {
  const row = await prisma.fieldForceCompany.create({
    data: { partnerId, name, columnMapping: {} },
  });
  return toRecord(row);
}

export async function setCompanyColumnMapping(
  id: string,
  partnerId: string,
  columnMapping: Record<string, CompanyUploadField>
): Promise<void> {
  const existing = await prisma.fieldForceCompany.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.fieldForceCompany.update({ where: { id }, data: { columnMapping } });
}

export async function setCompanyActive(id: string, partnerId: string, isActive: boolean): Promise<void> {
  const existing = await prisma.fieldForceCompany.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.fieldForceCompany.update({ where: { id }, data: { isActive } });
}
