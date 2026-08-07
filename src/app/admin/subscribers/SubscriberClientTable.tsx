"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { subscriberColumns, subscriberRows } from "@/lib/sample-data/subscribers";

export function SubscriberClientTable() {
  const router = useRouter();
  return (
    <DataTable
      columns={subscriberColumns}
      rows={subscriberRows}
      onRowClick={(row: Row) => router.push(`/vendor/${row["id"]}/admin/subscription`)}
    />
  );
}
