"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { billingPaymentColumns } from "@/lib/sample-data/billing-payments";

export function PaymentsClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? billingPaymentColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/billing/payments/${row["id"]}`)}
      enableQuickView
    />
  );
}
