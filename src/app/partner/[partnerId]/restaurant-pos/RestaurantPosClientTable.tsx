"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { restaurantPosColumns } from "@/lib/sample-data/restaurant-pos";

export function RestaurantPosClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? restaurantPosColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/restaurant-pos/${row["id"]}`)}
      enableQuickView
    />
  );
}
