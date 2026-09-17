"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { expenseColumns } from "@/lib/sample-data/billing-expenses";

export function ExpensesClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? expenseColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/billing/expenses/${row["id"]}`)}
      enableQuickView
    />
  );
}
