import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordDetail, type RecordField } from "@/components/RecordDetail";
import { getLegalClient } from "@/lib/legal";

registerPage({
  id: "legal.clients.detail",
  moduleSlug: "legal",
  title: "Legal — Client Detail",
  path: "/partner/[partnerId]/legal/clients/[clientId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [{ key: "field-grid", label: "Detail field grid" }],
  explanation: "Read-only detail view of a single LegalClient, with an Edit action in the header.",
  sourceFile: "src/app/partner/[partnerId]/legal/clients/[clientId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function LegalClientDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; clientId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  const mod = await getModule("legal");
  const client = await getLegalClient(params.partnerId, params.clientId);
  if (!client) notFound();

  const fields: RecordField[] = [
    { label: "Name", value: client.name, type: "text" },
    { label: "Contact Number", value: client.contact ?? "—", type: "phone" },
    { label: "Email", value: client.email ?? "—", type: "email" },
    { label: "Address", value: client.address ?? "—", type: "text" },
  ];

  return (
    <AppShell topbarTitle={mod?.label ?? "Legal / Case Management"}>
      <RecordDetail
        fields={fields}
        recordLabel={client.name}
        searchParams={searchParams}
        headerSlot={
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-bold text-text">{client.name}</h1>
              <p className="mt-1 text-xs text-text-muted">Client detail</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/partner/${params.partnerId}/legal/clients`} className="btn-outline">
                &larr; Back
              </Link>
              <Link href={`/partner/${params.partnerId}/legal/clients/${client.id}/edit`} className="btn-outline">
                Edit
              </Link>
            </div>
          </div>
        }
      />
    </AppShell>
  );
}
