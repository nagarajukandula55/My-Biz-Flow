"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { scProfileColumns } from "@/lib/sample-data/service-centre-sc-profile";

export function ScProfileClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? scProfileColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/service-centre/sc-profile/${row["id"]}`)}
      enableQuickView
    />
  );
}
