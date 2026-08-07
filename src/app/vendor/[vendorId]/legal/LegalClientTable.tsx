"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { legalColumns, legalRows } from "@/lib/sample-data/legal";

export function LegalClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={legalColumns}
      rows={legalRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/legal/${row["id"]}`)}
    />
  );
}
