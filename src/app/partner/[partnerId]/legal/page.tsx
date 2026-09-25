import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { LegalClientTable } from "./LegalClientTable";
import { LegalNewButton } from "./LegalNewButton";
import { listLegalMatters, listLegalClients } from "@/lib/legal";

registerPage({
  id: "legal.list",
  moduleSlug: "legal",
  title: "Legal / Case Management — List",
  path: "/partner/[partnerId]/legal",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation:
    "Lists every matter (LegalMatter — a real Prisma table, replacing the earlier BusinessRecord-backed store) with a \"+ New\" action to create one and row-click navigation into the matter's detail view.",
  sourceFile: "src/app/partner/[partnerId]/legal/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function LegalPage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("legal");
  const [rows, clients] = await Promise.all([
    listLegalMatters(params.partnerId),
    listLegalClients(params.partnerId),
  ]);

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Legal / Case Management"}
      topbarActions={<LegalNewButton partnerId={params.partnerId} clients={clients} />}
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <LegalClientTable partnerId={params.partnerId} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
