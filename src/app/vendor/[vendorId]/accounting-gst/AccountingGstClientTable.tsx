"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { accountingGstColumns, accountingGstRows } from "@/lib/sample-data/accounting-gst";

export function AccountingGstClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={accountingGstColumns}
      rows={accountingGstRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/accounting-gst/${row["id"]}`)}
    />
  );
}
