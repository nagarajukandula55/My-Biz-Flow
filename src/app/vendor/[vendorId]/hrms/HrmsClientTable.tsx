"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { hrmsColumns, hrmsRows } from "@/lib/sample-data/hrms";

export function HrmsClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={hrmsColumns}
      rows={hrmsRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/hrms/${row["id"]}`)}
    />
  );
}
