"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { scFaultCodeColumns } from "@/lib/sample-data/service-centre-fault-codes";

export function ScFaultCodeClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? scFaultCodeColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/service-centre/fault-codes/${row["id"]}`)}
      enableQuickView
    />
  );
}
