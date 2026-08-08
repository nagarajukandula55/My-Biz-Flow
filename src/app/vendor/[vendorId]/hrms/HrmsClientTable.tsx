"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { hrmsColumns, hrmsRows } from "@/lib/sample-data/hrms";

export function HrmsClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? hrmsColumns}
      rows={hrmsRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/hrms/${row["id"]}`)}
      enableQuickView
    />
  );
}
