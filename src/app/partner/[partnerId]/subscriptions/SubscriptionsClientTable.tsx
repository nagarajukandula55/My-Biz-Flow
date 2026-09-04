"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { subscriptionsColumns } from "@/lib/sample-data/subscriptions";

export function SubscriptionsClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? subscriptionsColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/subscriptions/${row["id"]}`)}
      enableQuickView
    />
  );
}
