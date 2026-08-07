"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { roleColumns, roleRows } from "@/lib/sample-data/roles";

export function RoleClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={roleColumns}
      rows={roleRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/admin/roles/${row["id"]}`)}
    />
  );
}
