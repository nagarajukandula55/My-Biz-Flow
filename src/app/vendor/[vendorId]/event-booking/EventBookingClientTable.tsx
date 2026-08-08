"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { eventBookingColumns } from "@/lib/sample-data/event-booking";

export function EventBookingClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? eventBookingColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/event-booking/${row["id"]}`)}
      enableQuickView
    />
  );
}
