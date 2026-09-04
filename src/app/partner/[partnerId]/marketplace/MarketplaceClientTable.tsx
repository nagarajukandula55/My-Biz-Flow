"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { marketplaceColumns } from "@/lib/sample-data/marketplace";

export function MarketplaceClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? marketplaceColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/marketplace/${row["id"]}`)}
      enableQuickView
    />
  );
}
