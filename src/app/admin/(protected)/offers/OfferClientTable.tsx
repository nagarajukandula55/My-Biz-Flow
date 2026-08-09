"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";

const offerColumns: Column[] = [
  { key: "id", label: "Offer ID", type: "text" },
  { key: "name", label: "Name", type: "text" },
  { key: "discountType", label: "Discount Type", type: "select-chip" },
  { key: "discountValue", label: "Discount Value", type: "text" },
  { key: "isCombo", label: "Combo", type: "select-chip" },
  { key: "isActive", label: "Active", type: "select-chip" },
];

export function OfferClientTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={offerColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/admin/offers/${row["id"]}`)}
    />
  );
}
