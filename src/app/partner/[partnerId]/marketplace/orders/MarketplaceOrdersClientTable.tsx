"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { marketplaceOrderColumns } from "@/lib/sample-data/marketplaceOrders";

export function MarketplaceOrdersClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? marketplaceOrderColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/marketplace/orders/${row["id"]}`)}
      enableQuickView
    />
  );
}
