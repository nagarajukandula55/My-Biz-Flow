"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { scSymptomCodeColumns } from "@/lib/sample-data/service-centre-symptom-codes";

export function ScSymptomCodeClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? scSymptomCodeColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/service-centre/symptom-codes/${row["id"]}`)}
      enableQuickView
    />
  );
}
