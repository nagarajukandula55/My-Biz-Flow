"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { restaurantPosColumns, restaurantPosRows } from "@/lib/sample-data/restaurant-pos";

export function RestaurantPosClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? restaurantPosColumns}
      rows={restaurantPosRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/restaurant-pos/${row["id"]}`)}
      enableQuickView
    />
  );
}
