"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { hrmsColumns } from "@/lib/sample-data/hrms";

export function HrmsClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? hrmsColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/hrms/${row["id"]}`)}
      enableQuickView
    />
  );
}
