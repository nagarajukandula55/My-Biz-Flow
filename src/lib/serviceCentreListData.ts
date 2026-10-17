import { prisma } from "@/lib/prisma";
import type { Row } from "@/components/DataTable";
import { DEFAULT_BUSINESS_RECORD_PAGE_SIZE } from "@/lib/businessRecords";

/** Count first so malformed or stale page links never create an unsafe offset. */
export async function listServiceCentrePage(partnerId: string, moduleSlug: "service-centre-customers" | "service-centre-inquiry", requestedPage?: string) {
  const pageSize = DEFAULT_BUSINESS_RECORD_PAGE_SIZE;
  const where = { partnerId, moduleSlug };
  const total = await prisma.businessRecord.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const parsed = Number(requestedPage);
  const page = Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, totalPages) : 1;
  const records = await prisma.businessRecord.findMany({ where, orderBy: { createdAt: "desc" }, take: pageSize, skip: (page - 1) * pageSize });
  const rows: Row[] = records.map(row => ({ ...(row.data as Record<string, unknown>), id: row.recordKey, recordCreatedAt: row.createdAt.toISOString() }));
  return { rows, total, totalPages, pageSize, page };
}
