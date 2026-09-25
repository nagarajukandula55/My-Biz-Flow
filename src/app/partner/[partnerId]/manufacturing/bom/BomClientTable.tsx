"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import type { StatusVariant } from "@/components/StatusChip";

const ACTIVE_VARIANT: Record<string, StatusVariant> = { Active: "success", Inactive: "neutral" };

export const bomColumns: Column[] = [
  { key: "id", label: "BOM ID", type: "text" },
  { key: "productName", label: "Product Name", type: "text" },
  { key: "productCode", label: "Product Code", type: "text" },
  { key: "version", label: "Version", type: "text" },
  { key: "lineCount", label: "Lines", type: "text" },
  { key: "statusLabel", label: "Status", type: "select-chip", chipVariantMap: ACTIVE_VARIANT },
];

export function BomClientTable({ partnerId, rows }: { partnerId: string; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={bomColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/manufacturing/bom/${row["id"]}`)}
      enableQuickView
    />
  );
}
