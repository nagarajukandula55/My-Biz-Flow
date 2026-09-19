import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { BomClientTable } from "./BomClientTable";
import { BomNewButton } from "./BomNewButton";
import { BomSearchButton } from "./BomSearchButton";
import { BomBulkUploadButton } from "./BomBulkUploadButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { bomColumns } from "@/lib/sample-data/bom";
import { listBusinessRecords } from "@/lib/businessRecords";

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

export default async function BomPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("inventory.bom.list", bomColumns);
  const rows = await listBusinessRecords(params.partnerId, "inventory-bom");
  // Same shape as getBomOptionsForPartner — derived from the already-fetched
  // `rows` instead of a second query, since this page needs them anyway.
  const bomOptions = rows
    .filter((r) => (r["status"] ?? "Active") === "Active")
    .map((r) => ({ value: String(r["id"]), label: `${r["id"]} — ${r["description"]}` }));

  return (
    <AppShell
      topbarTitle="Material Catalog (BOM)"
      topbarActions={
        <div className="flex items-center gap-3">
          <BomSearchButton options={bomOptions} />
          <BomBulkUploadButton partnerId={params.partnerId} />
          <BomNewButton partnerId={params.partnerId} />
        </div>
      }
    >
      <div>
        <div className="mt-2">
          <BomClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
