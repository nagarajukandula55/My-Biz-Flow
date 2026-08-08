"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { hrmsColumns } from "@/lib/sample-data/hrms";

export function HrmsClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? hrmsColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/hrms/${row["id"]}`)}
      enableQuickView
    />
  );
}
