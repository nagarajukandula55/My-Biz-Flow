"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { subscriptionsColumns } from "@/lib/sample-data/subscriptions";

export function SubscriptionsClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? subscriptionsColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/subscriptions/${row["id"]}`)}
      enableQuickView
    />
  );
}
