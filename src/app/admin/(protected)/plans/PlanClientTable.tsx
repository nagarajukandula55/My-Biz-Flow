"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { planColumns, planRows } from "@/lib/sample-data/plans";

export function PlanClientTable() {
  const router = useRouter();
  return (
    <DataTable
      columns={planColumns}
      rows={planRows}
      onRowClick={(row: Row) => router.push(`/admin/plans/${row["id"]}`)}
    />
  );
}
