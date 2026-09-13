"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { scVendorProfileColumns } from "@/lib/sample-data/service-centre-vendor-profile";

export function ScVendorProfileClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? scVendorProfileColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/service-centre/vendor-profile/${row["id"]}`)}
      enableQuickView
    />
  );
}
