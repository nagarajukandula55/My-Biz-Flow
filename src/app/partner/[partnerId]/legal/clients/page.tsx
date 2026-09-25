import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { listLegalClients } from "@/lib/legal";
import { ClientsTable } from "./ClientsTable";

registerPage({
  id: "legal.clients.list",
  moduleSlug: "legal",
  title: "Legal — Clients",
  path: "/partner/[partnerId]/legal/clients",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation:
    "Lists every client (LegalClient — a real Prisma table) for the legal module, with a \"+ New Client\" action and row-click navigation into the client's detail view. Matters (legal.list) reference a client via a real clientId foreign key.",
  sourceFile: "src/app/partner/[partnerId]/legal/clients/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function LegalClientsPage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("legal");
  const clients = await listLegalClients(params.partnerId);

  return (
    <AppShell
      topbarTitle={`Clients — ${mod?.label ?? "Legal / Case Management"}`}
      topbarActions={
        <Link href={`/partner/${params.partnerId}/legal/clients/new`} className="btn-accent">
          + New Client
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">Clients on file for this practice's matters.</p>
        <div className="mt-6">
          <ClientsTable partnerId={params.partnerId} clients={clients} />
        </div>
      </div>
    </AppShell>
  );
}
