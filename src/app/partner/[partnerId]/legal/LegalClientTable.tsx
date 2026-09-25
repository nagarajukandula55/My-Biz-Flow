"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/DataTable";
import type { StatusVariant } from "@/components/StatusChip";
import type { LegalMatterRecord } from "@/lib/legal";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Open: "teal",
  InProgress: "warning",
  OnHold: "amber",
  Closed: "neutral",
};

export const legalMatterColumns: Column[] = [
  { key: "matterNumber", label: "Matter #", type: "text" },
  { key: "title", label: "Title", type: "text" },
  { key: "clientName", label: "Client", type: "relation-link" },
  { key: "matterType", label: "Matter Type", type: "text" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
  { key: "openedDate", label: "Opened", type: "date" },
  { key: "closedDate", label: "Closed", type: "date" },
];

/** Renamed in spirit (matters, not "clients"), kept as LegalClientTable — the
 * original filename — since it's imported by the still-registered
 * legal.list page id and renaming the file/import would be a pure churn
 * change unrelated to the Prisma migration this pass is about. */
export function LegalClientTable({ partnerId, rows }: { partnerId: string; rows: LegalMatterRecord[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={legalMatterColumns}
      rows={rows}
      onRowClick={(row) => router.push(`/partner/${partnerId}/legal/${row["id"]}`)}
      enableQuickView
    />
  );
}
