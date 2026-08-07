"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { serviceCentreColumns, serviceCentreRows } from "@/lib/sample-data/service-centre";

export function ServiceCentreClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={serviceCentreColumns}
      rows={serviceCentreRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/service-centre/${row["id"]}`)}
    />
  );
}
