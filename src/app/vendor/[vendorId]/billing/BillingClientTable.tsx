"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { billingColumns, billingRows } from "@/lib/sample-data/billing";

export function BillingClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? billingColumns}
      rows={billingRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/billing/${row["id"]}`)}
      enableQuickView
    />
  );
}
