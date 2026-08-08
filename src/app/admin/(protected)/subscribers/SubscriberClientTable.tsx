"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";

const columns: Column[] = [
  { key: "id", label: "Vendor ID", type: "text" },
  { key: "businessName", label: "Business Name", type: "text" },
  { key: "vendorTypeId", label: "Vendor Type", type: "text" },
  { key: "status", label: "Status", type: "select-chip" },
  { key: "createdAt", label: "Registered", type: "date" },
];

export function SubscriberClientTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${row["id"]}/admin/subscription`)}
    />
  );
}
