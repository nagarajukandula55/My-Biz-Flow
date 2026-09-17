"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { customersColumns } from "@/lib/sample-data/service-centre-customers";

export function ScCustomerClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? customersColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/service-centre/customers/${row["id"]}`)}
      enableQuickView
    />
  );
}
