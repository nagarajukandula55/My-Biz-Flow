"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { wholesaleB2bColumns } from "@/lib/sample-data/wholesale-b2b";

export function WholesaleB2bClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? wholesaleB2bColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/wholesale-b2b/${row["id"]}`)}
      enableQuickView
    />
  );
}
