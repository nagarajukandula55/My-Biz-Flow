"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { marketplaceColumns, marketplaceRows } from "@/lib/sample-data/marketplace";

export function MarketplaceClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={marketplaceColumns}
      rows={marketplaceRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/marketplace/${row["id"]}`)}
    />
  );
}
