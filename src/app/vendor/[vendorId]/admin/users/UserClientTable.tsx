"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { userColumns, userRows } from "@/lib/sample-data/users";

export function UserClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={userColumns}
      rows={userRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/admin/users/${row["id"]}`)}
    />
  );
}
