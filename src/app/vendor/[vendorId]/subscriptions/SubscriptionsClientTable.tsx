"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { subscriptionsColumns, subscriptionsRows } from "@/lib/sample-data/subscriptions";

export function SubscriptionsClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? subscriptionsColumns}
      rows={subscriptionsRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/subscriptions/${row["id"]}`)}
    />
  );
}
