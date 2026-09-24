import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { getLead } from "@/lib/telecalling/leadsData";
import { EditLeadForm } from "./EditLeadForm";

registerPage({
  id: "telecalling.lead-edit",
  moduleSlug: "telecalling",
  title: "Telecalling — Edit Lead",
  path: "/partner/[partnerId]/telecalling/leads/[id]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Corrects a lead's own contact details (name/phone/email/source/state/city/notes) after entry or CSV import — a typo a telecaller or admin needs to fix without re-importing. Status and assignment are unaffected; those stay on updateLeadStatus/assignLead via the queue and lead list.",
  sourceFile: "src/app/partner/[partnerId]/telecalling/leads/[id]/edit/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function EditLeadPage({ params }: { params: { partnerId: string; id: string } }) {
  const lead = await getLead(params.id, params.partnerId);
  if (!lead) notFound();

  return (
    <AppShell topbarTitle="Telecalling — Edit Lead">
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <Link href={`/partner/${params.partnerId}/telecalling/leads/${params.id}`} className="text-sm font-semibold text-accent hover:underline">
            &larr; Back to Lead
          </Link>
          <h1 className="mt-2 font-display text-lg font-bold text-text">Edit Lead</h1>
          <p className="mt-1 text-xs text-text-muted">{lead.name}</p>
        </div>
        <div className="p-6">
          <EditLeadForm partnerId={params.partnerId} lead={lead} />
        </div>
      </div>
    </AppShell>
  );
}
