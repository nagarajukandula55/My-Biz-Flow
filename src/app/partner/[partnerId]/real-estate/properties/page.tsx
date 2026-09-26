import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { PropertiesClientTable } from "./PropertiesClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { propertyColumns, propertyToRow } from "@/lib/sample-data/properties";
import { listProperties } from "@/lib/realEstateData";

registerPage({
  id: "real-estate.properties.list",
  moduleSlug: "real-estate",
  title: "Real Estate — Properties",
  path: "/partner/[partnerId]/real-estate/properties",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
  ],
  explanation: "Lists every Property (listing) for this partner — type, address, price, area, bedrooms, listing status, agent, next site visit — Prisma-backed, with a \"+ New\" action and row-click navigation into the record's detail view. An Enquiry (the module's main list) links to a Property via propertyId.",
  sourceFile: "src/app/partner/[partnerId]/real-estate/properties/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function PropertiesPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("real-estate.properties.list", propertyColumns);
  const properties = await listProperties(params.partnerId);
  const rows = properties.map(propertyToRow);

  return (
    <AppShell
      topbarTitle="Real Estate — Properties"
      topbarActions={
        <Link href={`/partner/${params.partnerId}/real-estate/properties/new`} className="btn-accent">
          + New Property
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">Listings this partner manages — Apartments, Villas, Plots, Commercial.</p>
        <div className="mt-6">
          <PropertiesClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
