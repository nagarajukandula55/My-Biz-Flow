"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { eventBookingColumns, eventBookingRows } from "@/lib/sample-data/event-booking";

export function EventBookingClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? eventBookingColumns}
      rows={eventBookingRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/event-booking/${row["id"]}`)}
    />
  );
}
