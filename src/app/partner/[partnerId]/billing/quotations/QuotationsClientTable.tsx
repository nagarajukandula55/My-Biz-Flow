"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { quotationColumns } from "@/lib/sample-data/billing-sales-documents";

export function QuotationsClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? quotationColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/billing/quotations/${row["id"]}`)}
      enableQuickView
    />
  );
}
