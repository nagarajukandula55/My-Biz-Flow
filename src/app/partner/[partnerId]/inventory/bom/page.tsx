import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { BomClientTable } from "./BomClientTable";
import { BomNewButton } from "./BomNewButton";
import { BomSearchButton } from "./BomSearchButton";
import { BomBulkUploadButton } from "./BomBulkUploadButton";
import { RecordCsvExportButton } from "@/components/RecordCsvExportButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { bomColumns } from "@/lib/sample-data/bom";
import { listBusinessRecords, listBusinessRecordsPaginated } from "@/lib/businessRecords";
import { isActiveMaterial } from "@/lib/materialStatus";
import { PaginationControls, buildPageQueryString } from "@/components/PaginationControls";

registerPage({
  id: "inventory.bom.list",
  moduleSlug: "inventory",
  title: "Material Catalog (BOM) — List",
  path: "/partner/[partnerId]/inventory/bom",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every material catalog entry, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/inventory/bom/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function BomPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: { page?: string };
}) {
  const columns = await applyCustomizations("inventory.bom.list", bomColumns);
  const page = Math.max(1, Number(searchParams.page) || 1);
  // Two reads: BomSearchButton's typeahead and the CSV export both need
  // every material, not just the current page, while the table itself
  // only renders one page at a time.
  const [allRows, { rows, total, totalPages, pageSize }] = await Promise.all([
    listBusinessRecords(params.partnerId, "inventory-bom"),
    listBusinessRecordsPaginated(params.partnerId, "inventory-bom", { page }),
  ]);
  // Same shape as getBomOptionsForPartner — derived from the already-fetched
  // `allRows` instead of a second query, since this page needs them anyway.
  const bomOptions = allRows
    .filter((r) => isActiveMaterial(r))
    .map((r) => ({ value: String(r["id"]), label: `${r["id"]} — ${r["description"] ?? r["id"]}` }));

  return (
    <AppShell
      topbarTitle="Material Catalog (BOM)"
      topbarActions={
        <div className="flex items-center gap-3">
          <BomSearchButton options={bomOptions} />
          <BomBulkUploadButton partnerId={params.partnerId} />
          <BomNewButton partnerId={params.partnerId} />
          <RecordCsvExportButton
            columns={columns.map((c) => ({ key: c.key, type: c.type === "date" ? "date" : c.type === "datetime" ? "datetime" : undefined }))}
            rows={allRows}
            filename={`bom-${params.partnerId}-${new Date().toISOString().slice(0, 10)}.csv`}
          />
        </div>
      }
    >
      <div>
        <div className="mt-2">
          <BomClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
        <PaginationControls
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          buildHref={(p) => buildPageQueryString(searchParams, { page: String(p) })}
        />
      </div>
    </AppShell>
  );
}
