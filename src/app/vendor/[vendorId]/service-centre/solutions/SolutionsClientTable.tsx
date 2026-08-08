"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { solutionsColumns } from "@/lib/sample-data/solutions";

export function SolutionsClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? solutionsColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/service-centre/solutions/${row["id"]}`)}
      enableQuickView
    />
  );
}
