"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { educationColumns } from "@/lib/sample-data/education";

export function EducationClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? educationColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/education/${row["id"]}`)}
      enableQuickView
    />
  );
}
