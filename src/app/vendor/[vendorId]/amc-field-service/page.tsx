import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { AmcFieldServiceClientTable } from "./AmcFieldServiceClientTable";

registerPage({
  id: "amc-field-service.list",
  moduleSlug: "amc-field-service",
  title: "AMC / Field Service — List",
  path: "/vendor/[vendorId]/amc-field-service",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every contract record for the amc-field-service module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/amc-field-service/page.tsx",
});

export default function AmcFieldServicePage({ params }: { params: { vendorId: string } }) {
  const mod = getModule("amc-field-service");

  return (
    <AppShell
      navGroups={buildVendorNavGroups("amc-field-service")}
      topbarTitle={mod?.label ?? "AMC / Field Service"}
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/amc-field-service/new`} className="btn-accent">
          + New Contract
        </Link>
      }
    >
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">{mod?.label}</h1>
        <p className="mt-1 text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <AmcFieldServiceClientTable vendorId={params.vendorId} />
        </div>
      </div>
    </AppShell>
  );
}

