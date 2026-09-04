"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { billingColumns } from "@/lib/sample-data/billing";

export function BillingClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? billingColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/billing/${row["id"]}`)}
      enableQuickView
    />
  );
}
