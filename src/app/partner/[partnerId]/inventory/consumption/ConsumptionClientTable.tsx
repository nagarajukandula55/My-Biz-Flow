"use client";

import { DataTable, type Row, type Column } from "@/components/DataTable";
import { RecordCsvExportButton } from "@/components/RecordCsvExportButton";
import { consumptionColumns } from "@/lib/sample-data/consumption";

export function ConsumptionClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const cols = columns ?? consumptionColumns;
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <RecordCsvExportButton
          columns={cols.map((c) => ({ key: c.key, type: c.type === "date" ? "date" : c.type === "datetime" ? "datetime" : undefined }))}
          rows={rows}
          filename={`parts-consumption-${partnerId}-${new Date().toISOString().slice(0, 10)}.csv`}
        />
      </div>
      <DataTable columns={cols} rows={rows} enableQuickView />
    </div>
  );
}
