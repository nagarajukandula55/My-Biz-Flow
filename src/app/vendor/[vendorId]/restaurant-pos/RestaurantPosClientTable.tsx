"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { restaurantPosColumns, restaurantPosRows } from "@/lib/sample-data/restaurant-pos";

export function RestaurantPosClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={restaurantPosColumns}
      rows={restaurantPosRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/restaurant-pos/${row["id"]}`)}
    />
  );
}
