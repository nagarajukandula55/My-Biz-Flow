"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { subscriptionsColumns, subscriptionsRows } from "@/lib/sample-data/subscriptions";

export function SubscriptionsClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={subscriptionsColumns}
      rows={subscriptionsRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/subscriptions/${row["id"]}`)}
    />
  );
}
