"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { loyaltyRewardsColumns } from "@/lib/sample-data/loyalty-rewards";

export function LoyaltyRewardsClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? loyaltyRewardsColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/loyalty-rewards/${row["id"]}`)}
      enableQuickView
    />
  );
}
