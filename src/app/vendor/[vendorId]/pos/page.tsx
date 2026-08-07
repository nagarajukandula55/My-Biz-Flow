import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { PosClientTable } from "./PosClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { posColumns } from "@/lib/sample-data/pos";

registerPage({
  id: "pos.list",
  moduleSlug: "pos",
  title: "POS — List",
  path: "/vendor/[vendorId]/pos",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every sale record for the pos module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/pos/page.tsx",
});

export default function PosPage({ params }: { params: { vendorId: string } }) {
  const mod = getModule("pos");
  const columns = applyCustomizations("pos.list", posColumns);

  return (
    <AppShell
      navGroups={buildVendorNavGroups("pos")}
      topbarTitle={mod?.label ?? "POS"}
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/pos/new`} className="btn-accent">
          + New Sale
        </Link>
      }
    >
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">{mod?.label}</h1>
        <p className="mt-1 text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <PosClientTable vendorId={params.vendorId} columns={columns} />
        </div>
      </div>
    </AppShell>
  );
}

