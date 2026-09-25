"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { wholesaleCustomerColumns } from "@/lib/sample-data/wholesaleCustomers";

export function WholesaleCustomersClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? wholesaleCustomerColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/wholesale-b2b/customers/${row["id"]}`)}
      enableQuickView
    />
  );
}
