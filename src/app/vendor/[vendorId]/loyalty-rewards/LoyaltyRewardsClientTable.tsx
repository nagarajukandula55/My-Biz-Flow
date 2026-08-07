"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { loyaltyRewardsColumns, loyaltyRewardsRows } from "@/lib/sample-data/loyalty-rewards";

export function LoyaltyRewardsClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={loyaltyRewardsColumns}
      rows={loyaltyRewardsRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/loyalty-rewards/${row["id"]}`)}
    />
  );
}
