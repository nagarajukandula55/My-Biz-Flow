"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { userColumns } from "@/lib/sample-data/users";

export function UserClientTable({ partnerId, rows }: { partnerId: string; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={userColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/admin/users/${row["id"]}`)}
    />
  );
}
