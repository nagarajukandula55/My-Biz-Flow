"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { legalColumns, legalRows } from "@/lib/sample-data/legal";

export function LegalClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? legalColumns}
      rows={legalRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/legal/${row["id"]}`)}
      enableQuickView
    />
  );
}
