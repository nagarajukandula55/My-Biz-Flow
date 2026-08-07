"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { educationColumns, educationRows } from "@/lib/sample-data/education";

export function EducationClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={educationColumns}
      rows={educationRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/education/${row["id"]}`)}
    />
  );
}
