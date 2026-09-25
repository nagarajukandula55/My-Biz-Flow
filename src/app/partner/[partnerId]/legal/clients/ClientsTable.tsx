"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/DataTable";
import type { LegalClientRecord } from "@/lib/legal";

const columns: Column[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "contact", label: "Contact", type: "phone" },
  { key: "email", label: "Email", type: "email" },
  { key: "address", label: "Address", type: "text", maxWidthCh: 40 },
];

export function ClientsTable({ partnerId, clients }: { partnerId: string; clients: LegalClientRecord[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns}
      rows={clients}
      onRowClick={(row) => router.push(`/partner/${partnerId}/legal/clients/${row["id"]}`)}
      enableQuickView
    />
  );
}
