import { redirect } from "next/navigation";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { registerPage } from "@/lib/designer/registry";

export const dynamic = "force-dynamic";
registerPage({ id: "accounting.home", moduleSlug: "accounting", title: "Accounting", path: "/partner/[partnerId]/accounting",
  kind: "other", superAdminOnly: false, customizableRegions: [],
  explanation: "Entry point for the Accounting module; sends authenticated partners to their chart of accounts.",
  sourceFile: "src/app/partner/[partnerId]/accounting/page.tsx" });

export default async function AccountingHome({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  redirect(`/partner/${params.partnerId}/accounting/chart-of-accounts`);
}
