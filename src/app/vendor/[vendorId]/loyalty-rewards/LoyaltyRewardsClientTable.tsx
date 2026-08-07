"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { loyaltyRewardsColumns, loyaltyRewardsRows } from "@/lib/sample-data/loyalty-rewards";

export function LoyaltyRewardsClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? loyaltyRewardsColumns}
      rows={loyaltyRewardsRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/loyalty-rewards/${row["id"]}`)}
    />
  );
}
