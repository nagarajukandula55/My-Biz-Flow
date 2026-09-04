"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { billingContactColumns } from "@/lib/sample-data/billing-contacts";

export function ContactsClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? billingContactColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/billing/contacts/${row["id"]}`)}
      enableQuickView
    />
  );
}
