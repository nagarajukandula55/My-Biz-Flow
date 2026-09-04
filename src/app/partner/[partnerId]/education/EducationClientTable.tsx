"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { educationColumns } from "@/lib/sample-data/education";

export function EducationClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? educationColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/education/${row["id"]}`)}
      enableQuickView
    />
  );
}
