"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";

const columns: Column[] = [
  { key: "id", label: "Access Group", type: "text" },
  { key: "description", label: "Description", type: "text" },
  { key: "pagesGranted", label: "Pages With Access", type: "text" },
];

export function AccessGroupClientTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/admin/access-groups/${row["id"]}`)}
    />
  );
}
