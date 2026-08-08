"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { serviceCentreColumns, serviceCentreRows } from "@/lib/sample-data/service-centre";

export function ServiceCentreClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? serviceCentreColumns}
      rows={serviceCentreRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/service-centre/${row["id"]}`)}
      enableQuickView
    />
  );
}
