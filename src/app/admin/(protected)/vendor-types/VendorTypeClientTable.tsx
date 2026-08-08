"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { vendorTypeColumns, vendorTypeRows } from "@/lib/sample-data/vendor-types";

export function VendorTypeClientTable() {
  const router = useRouter();
  return (
    <DataTable
      columns={vendorTypeColumns}
      rows={vendorTypeRows}
      onRowClick={(row: Row) => router.push(`/admin/vendor-types/${row["id"]}`)}
    />
  );
}
