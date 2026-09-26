"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { propertyColumns } from "@/lib/sample-data/properties";

export function PropertiesClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? propertyColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/real-estate/properties/${row["id"]}`)}
      enableQuickView
    />
  );
}
