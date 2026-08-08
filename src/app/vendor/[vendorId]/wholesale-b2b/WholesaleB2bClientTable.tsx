"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { wholesaleB2bColumns } from "@/lib/sample-data/wholesale-b2b";

export function WholesaleB2bClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? wholesaleB2bColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/wholesale-b2b/${row["id"]}`)}
      enableQuickView
    />
  );
}
