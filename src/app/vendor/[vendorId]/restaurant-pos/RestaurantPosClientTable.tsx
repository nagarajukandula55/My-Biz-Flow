"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { restaurantPosColumns } from "@/lib/sample-data/restaurant-pos";

export function RestaurantPosClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? restaurantPosColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/restaurant-pos/${row["id"]}`)}
      enableQuickView
    />
  );
}
