"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { educationColumns, educationRows } from "@/lib/sample-data/education";

export function EducationClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? educationColumns}
      rows={educationRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/education/${row["id"]}`)}
      enableQuickView
    />
  );
}
