import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { ServiceCentreClientTable } from "./ServiceCentreClientTable";
import { ServiceCentreNewButton } from "./ServiceCentreNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { serviceCentreColumns } from "@/lib/sample-data/service-centre";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "service-centre.list",
  moduleSlug: "service-centre",
  title: "Service Centre — List",
  path: "/partner/[partnerId]/service-centre",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every workorder record for the service-centre module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/page.tsx",
});

export const dynamic = "force-dynamic";

/**
 * Server-side filtering read from URL searchParams — a plain GET form, no
 * client JS required, matching this app's "server components read data
 * directly at render time" convention. Extends (rather than replaces) the
 * plain list view for status/priority/brand/model/technician/date-range/
 * customer-device search.
 */
export default async function ServiceCentrePage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: { [key: string]: string | undefined };
}) {
  const mod = await getModule("service-centre");
  const columns = await applyCustomizations("service-centre.list", serviceCentreColumns);
  const allRows = await listBusinessRecords(params.partnerId, "service-centre");

  const { status, priority, brandName, modelName, technicianName, from, to, q } = searchParams;

  const rows = allRows.filter((r) => {
    if (status && String(r["status"] ?? "") !== status) return false;
    if (priority && String(r["priority"] ?? "") !== priority) return false;
    if (brandName && String(r["brandName"] ?? "") !== brandName) return false;
    if (modelName && String(r["modelName"] ?? "") !== modelName) return false;
    if (technicianName && String(r["technicianName"] ?? "") !== technicianName) return false;
    if (from && String(r["receivedDate"] ?? "") < from) return false;
    if (to && String(r["receivedDate"] ?? "") > to) return false;
    if (q) {
      const needle = q.toLowerCase();
      const haystack = `${r["customer"] ?? ""} ${r["device"] ?? ""} ${r["id"] ?? ""}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  const distinct = (key: string) => Array.from(new Set(allRows.map((r) => String(r[key] ?? "")).filter(Boolean)));
  const statusOptions = distinct("status");
  const priorityOptions = distinct("priority");
  const brandOptions = distinct("brandName");
  const modelOptions = distinct("modelName");
  const technicianOptions = distinct("technicianName");

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Service Centre"}
      topbarActions={
        <ServiceCentreNewButton partnerId={params.partnerId} />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>

        <form className="mt-4 flex flex-wrap items-end gap-3 rounded-md border border-border bg-bg-raised p-3" method="get">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Search</label>
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Customer, device, job id…"
              className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text"
            />
          </div>
          <FilterSelect label="Status" name="status" value={status} options={statusOptions} />
          <FilterSelect label="Priority" name="priority" value={priority} options={priorityOptions} />
          <FilterSelect label="Brand" name="brandName" value={brandName} options={brandOptions} />
          <FilterSelect label="Model" name="modelName" value={modelName} options={modelOptions} />
          <FilterSelect label="Technician" name="technicianName" value={technicianName} options={technicianOptions} />
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">From</label>
            <input type="date" name="from" defaultValue={from ?? ""} className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">To</label>
            <input type="date" name="to" defaultValue={to ?? ""} className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text" />
          </div>
          <button type="submit" className="btn-accent">Apply</button>
          <a href={`/partner/${params.partnerId}/service-centre`} className="btn-outline">Clear</a>
        </form>

        <div className="mt-6">
          <ServiceCentreClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}

function FilterSelect({ label, name, value, options }: { label: string; name: string; value?: string; options: string[] }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</label>
      <select name={name} defaultValue={value ?? ""} className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text">
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

