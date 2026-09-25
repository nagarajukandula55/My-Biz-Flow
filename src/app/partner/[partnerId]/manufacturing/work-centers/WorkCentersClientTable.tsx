"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import type { StatusVariant } from "@/components/StatusChip";

const ACTIVE_VARIANT: Record<string, StatusVariant> = { Active: "success", Inactive: "neutral" };

export const workCenterColumns: Column[] = [
  { key: "id", label: "Work Center ID", type: "text" },
  { key: "name", label: "Name", type: "text" },
  { key: "capacityPerDay", label: "Capacity / Day", type: "text" },
  { key: "statusLabel", label: "Status", type: "select-chip", chipVariantMap: ACTIVE_VARIANT },
];

export function WorkCentersClientTable({ partnerId, rows }: { partnerId: string; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={workCenterColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/manufacturing/work-centers/${row["id"]}`)}
      enableQuickView
    />
  );
}
