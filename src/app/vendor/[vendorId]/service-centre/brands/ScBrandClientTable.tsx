"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { scBrandColumns } from "@/lib/sample-data/service-centre-brands";

export function ScBrandClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? scBrandColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/service-centre/brands/${row["id"]}`)}
      enableQuickView
    />
  );
}
