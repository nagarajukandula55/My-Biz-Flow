"use client";

import { DataTable, type Row, type Column } from "@/components/DataTable";
import { stockTakeColumns } from "@/lib/sample-data/warehouse";

export function StockTakeClientTable({ columns, rows }: { columns?: Column[]; rows: Row[] }) {
  return <DataTable columns={columns ?? stockTakeColumns} rows={rows} enableQuickView />;
}
