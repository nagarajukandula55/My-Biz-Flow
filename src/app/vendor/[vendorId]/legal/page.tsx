import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { LegalClientTable } from "./LegalClientTable";

registerPage({
  id: "legal.list",
  moduleSlug: "legal",
  title: "Legal / Case Management — List",
  path: "/vendor/[vendorId]/legal",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every matter record for the legal module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/legal/page.tsx",
});

export default function LegalPage({ params }: { params: { vendorId: string } }) {
  const mod = getModule("legal");

  return (
    <AppShell
      navGroups={buildVendorNavGroups("legal")}
      topbarTitle={mod?.label ?? "Legal / Case Management"}
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/legal/new`} className="btn-accent">
          + New Matter
        </Link>
      }
    >
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">{mod?.label}</h1>
        <p className="mt-1 text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <LegalClientTable vendorId={params.vendorId} />
        </div>
      </div>
    </AppShell>
  );
}

