"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { legalColumns } from "@/lib/sample-data/legal";

export function LegalClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? legalColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/legal/${row["id"]}`)}
      enableQuickView
    />
  );
}
