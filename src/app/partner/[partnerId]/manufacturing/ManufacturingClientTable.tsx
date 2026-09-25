"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import type { StatusVariant } from "@/components/StatusChip";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Planned: "neutral",
  InProduction: "warning",
  QC: "amber",
  Completed: "success",
  Delayed: "danger",
};

export const productionOrderColumns: Column[] = [
  { key: "id", label: "Production Order ID", type: "text" },
  { key: "productName", label: "Product", type: "text" },
  { key: "bomProductName", label: "Bill of Materials", type: "text" },
  { key: "workCenterName", label: "Work Center", type: "text" },
  { key: "quantityPlanned", label: "Quantity Planned", type: "text" },
  { key: "quantityProduced", label: "Quantity Produced", type: "text" },
  { key: "plannedStartDate", label: "Planned Start", type: "date" },
  { key: "plannedEndDate", label: "Planned End", type: "date" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
];

export function ManufacturingClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? productionOrderColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/manufacturing/${row["id"]}`)}
      enableQuickView
    />
  );
}
