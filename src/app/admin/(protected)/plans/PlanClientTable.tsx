"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { planColumns } from "@/lib/sample-data/plans";

export function PlanClientTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={planColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/admin/plans/${row["id"]}`)}
    />
  );
}
