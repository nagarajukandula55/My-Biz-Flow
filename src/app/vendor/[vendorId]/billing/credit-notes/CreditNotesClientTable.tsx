"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { creditNoteColumns } from "@/lib/sample-data/billing-credit-notes";

export function CreditNotesClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? creditNoteColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/billing/credit-notes/${row["id"]}`)}
      enableQuickView
    />
  );
}
