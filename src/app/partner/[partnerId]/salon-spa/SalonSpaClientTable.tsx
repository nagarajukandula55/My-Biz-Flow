"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { salonSpaColumns } from "@/lib/sample-data/salon-spa";

export function SalonSpaClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? salonSpaColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/salon-spa/${row["id"]}`)}
      enableQuickView
    />
  );
}
