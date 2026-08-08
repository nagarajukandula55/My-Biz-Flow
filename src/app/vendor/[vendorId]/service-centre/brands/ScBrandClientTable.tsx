"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { scBrandColumns, scBrandRows } from "@/lib/sample-data/service-centre-brands";

export function ScBrandClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? scBrandColumns}
      rows={scBrandRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/service-centre/brands/${row["id"]}`)}
      enableQuickView
    />
  );
}
