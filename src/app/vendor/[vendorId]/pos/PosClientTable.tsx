"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { posColumns, posRows } from "@/lib/sample-data/pos";

export function PosClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={posColumns}
      rows={posRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/pos/${row["id"]}`)}
    />
  );
}
