import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { ClinicClientTable } from "./ClinicClientTable";

registerPage({
  id: "clinic.list",
  moduleSlug: "clinic",
  title: "Clinic — List",
  path: "/vendor/[vendorId]/clinic",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every appointment record for the clinic module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/clinic/page.tsx",
});

export default function ClinicPage({ params }: { params: { vendorId: string } }) {
  const mod = getModule("clinic");

  return (
    <AppShell
      navGroups={buildVendorNavGroups("clinic")}
      topbarTitle={mod?.label ?? "Clinic"}
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/clinic/new`} className="btn-accent">
          + New Appointment
        </Link>
      }
    >
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">{mod?.label}</h1>
        <p className="mt-1 text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <ClinicClientTable vendorId={params.vendorId} />
        </div>
      </div>
    </AppShell>
  );
}

