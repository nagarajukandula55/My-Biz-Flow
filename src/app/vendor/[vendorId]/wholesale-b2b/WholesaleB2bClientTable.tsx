"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { wholesaleB2bColumns, wholesaleB2bRows } from "@/lib/sample-data/wholesale-b2b";

export function WholesaleB2bClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={wholesaleB2bColumns}
      rows={wholesaleB2bRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/wholesale-b2b/${row["id"]}`)}
    />
  );
}
