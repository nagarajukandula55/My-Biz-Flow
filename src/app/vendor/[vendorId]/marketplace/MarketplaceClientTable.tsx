"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { marketplaceColumns } from "@/lib/sample-data/marketplace";

export function MarketplaceClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? marketplaceColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/marketplace/${row["id"]}`)}
      enableQuickView
    />
  );
}
