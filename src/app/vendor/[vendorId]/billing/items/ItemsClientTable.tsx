"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { billingItemColumns } from "@/lib/sample-data/billing-items";

export function ItemsClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? billingItemColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/billing/items/${row["id"]}`)}
      enableQuickView
    />
  );
}
