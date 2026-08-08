"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { accessGroupColumns, accessGroupRows } from "@/lib/sample-data/access-groups";

export function AccessGroupClientTable() {
  const router = useRouter();
  return (
    <DataTable
      columns={accessGroupColumns}
      rows={accessGroupRows}
      onRowClick={(row: Row) => router.push(`/admin/access-groups/${row["id"]}`)}
    />
  );
}
