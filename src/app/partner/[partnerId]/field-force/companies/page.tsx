import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { listCompanies } from "@/lib/fieldForce/companiesData";
import {
  createCompanyAction,
  setCompanyColumnMappingAction,
  setCompanyActiveAction,
  importCompanyBookingsAction,
} from "@/lib/fieldForce/actions";
import { CompaniesClient } from "./CompaniesClient";

registerPage({
  id: "field-force.companies",
  moduleSlug: "field-force",
  title: "Field Force — Companies",
  path: "/partner/[partnerId]/field-force/companies",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "An upstream OEM/brand this partner does job work for, distinct from the end Customer on a Booking. Each Company has its own saved CSV column mapping (columnMapping on FieldForceCompany) — set it up once, then every future job-data file from that company auto-maps and bulk-creates real Bookings tagged with that company, each one auto-dispatched to the nearest eligible engineer by pincode (see src/lib/fieldForce/companyImport.ts, matchingEngine.ts, geo.ts).",
  sourceFile: "src/app/partner/[partnerId]/field-force/companies/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function CompaniesPage({ params }: { params: { partnerId: string } }) {
  const companies = await listCompanies(params.partnerId);

  return (
    <AppShell topbarTitle="Field Force — Companies">
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Companies</h1>
          <p className="mt-1 text-sm text-text-muted">
            Each company remembers its own file layout — set the column mapping once, then every future upload
            from them just works.
          </p>
        </div>
        <div className="p-6">
          <CompaniesClient
            partnerId={params.partnerId}
            companies={companies.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() }))}
            createAction={createCompanyAction.bind(null, params.partnerId)}
            setMappingAction={setCompanyColumnMappingAction.bind(null, params.partnerId)}
            setActiveAction={setCompanyActiveAction.bind(null, params.partnerId)}
            importAction={importCompanyBookingsAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
