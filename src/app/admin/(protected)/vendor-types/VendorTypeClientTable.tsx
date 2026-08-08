"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";

const columns: Column[] = [
  { key: "id", label: "Vendor Type", type: "text" },
  { key: "description", label: "Description", type: "text" },
  { key: "defaultModules", label: "Default Modules", type: "multi-chip" },
  { key: "assignableRoleIds", label: "Assignable Roles", type: "multi-chip" },
  { key: "tieredPageCount", label: "Pages Tiered", type: "text" },
  { key: "status", label: "Status", type: "select-chip" },
];

export function VendorTypeClientTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/admin/vendor-types/${row["id"]}`)}
    />
  );
}
