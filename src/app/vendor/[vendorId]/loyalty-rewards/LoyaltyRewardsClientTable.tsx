"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { loyaltyRewardsColumns } from "@/lib/sample-data/loyalty-rewards";

export function LoyaltyRewardsClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? loyaltyRewardsColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/loyalty-rewards/${row["id"]}`)}
      enableQuickView
    />
  );
}
