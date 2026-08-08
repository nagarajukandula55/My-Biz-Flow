"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { solutionsColumns, solutionsRows } from "@/lib/sample-data/solutions";

export function SolutionsClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? solutionsColumns}
      rows={solutionsRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/service-centre/solutions/${row["id"]}`)}
      enableQuickView
    />
  );
}
