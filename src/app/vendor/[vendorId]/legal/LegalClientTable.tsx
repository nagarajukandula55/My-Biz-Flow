"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { legalColumns } from "@/lib/sample-data/legal";

export function LegalClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? legalColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/legal/${row["id"]}`)}
      enableQuickView
    />
  );
}
