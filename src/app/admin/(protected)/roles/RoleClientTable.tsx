"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";

const columns: Column[] = [
  { key: "id", label: "Role", type: "text" },
  { key: "description", label: "Description", type: "text" },
  { key: "accessGroupIds", label: "Access Groups", type: "multi-chip" },
];

export function RoleClientTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/admin/roles/${row["id"]}`)}
    />
  );
}
