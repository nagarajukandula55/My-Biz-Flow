"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { scStaffNameColumns } from "@/lib/sample-data/service-centre-staff-names";

export function ScStaffNameClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? scStaffNameColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/service-centre/staff-names/${row["id"]}`)}
      enableQuickView
    />
  );
}
