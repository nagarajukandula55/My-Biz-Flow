"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { eventBookingColumns, eventBookingRows } from "@/lib/sample-data/event-booking";

export function EventBookingClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={eventBookingColumns}
      rows={eventBookingRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/event-booking/${row["id"]}`)}
    />
  );
}
