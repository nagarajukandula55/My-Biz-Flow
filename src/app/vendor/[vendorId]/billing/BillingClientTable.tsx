"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { billingColumns, billingRows } from "@/lib/sample-data/billing";

export function BillingClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={billingColumns}
      rows={billingRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/billing/${row["id"]}`)}
    />
  );
}
