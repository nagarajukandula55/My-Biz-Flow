"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { userColumns } from "@/lib/sample-data/users";

export function UserClientTable({ vendorId, rows }: { vendorId: string; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={userColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/admin/users/${row["id"]}`)}
    />
  );
}
