"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { marketplaceColumns, marketplaceRows } from "@/lib/sample-data/marketplace";

export function MarketplaceClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? marketplaceColumns}
      rows={marketplaceRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/marketplace/${row["id"]}`)}
      enableQuickView
    />
  );
}
