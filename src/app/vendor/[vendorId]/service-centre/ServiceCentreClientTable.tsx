"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { serviceCentreColumns } from "@/lib/sample-data/service-centre";

export function ServiceCentreClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? serviceCentreColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/service-centre/${row["id"]}`)}
      enableQuickView
    />
  );
}
