"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";

export function EventBookingClientTable({ partnerId, columns, rows }: { partnerId: string; columns: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/event-booking/${row["id"]}`)}
      enableQuickView
    />
  );
}
