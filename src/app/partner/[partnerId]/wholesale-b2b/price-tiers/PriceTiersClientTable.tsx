"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { priceTierColumns } from "@/lib/sample-data/priceTiers";

export function PriceTiersClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? priceTierColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/wholesale-b2b/price-tiers/${row["id"]}`)}
      enableQuickView
    />
  );
}
