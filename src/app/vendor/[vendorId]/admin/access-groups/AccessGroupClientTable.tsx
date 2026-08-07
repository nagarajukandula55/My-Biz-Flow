"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { accessGroupColumns, accessGroupRows } from "@/lib/sample-data/access-groups";

export function AccessGroupClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={accessGroupColumns}
      rows={accessGroupRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/admin/access-groups/${row["id"]}`)}
    />
  );
}
