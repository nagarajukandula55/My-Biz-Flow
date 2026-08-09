import { notFound } from "next/navigation";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { getOffer } from "@/lib/subscriptionData";
import { listPlans } from "@/lib/plansData";
import { OfferForm } from "../../OfferForm";
import { updateOfferAction } from "../../actions";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.offers.edit",
  moduleSlug: "platform",
  title: "Offers — Edit",
  path: "/admin/offers/[recordId]/edit",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Edit form for an existing Offer.",
  sourceFile: "src/app/admin/(protected)/offers/[recordId]/edit/page.tsx",
});

export default async function EditOfferPage({ params }: { params: { recordId: string } }) {
  const offer = await getOffer(params.recordId);
  if (!offer) notFound();
  const plans = await listPlans();
  const action = updateOfferAction.bind(null, offer.id);

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Edit Offer</h1>
        </div>
        <div className="p-6">
          <p className="mb-6 text-sm text-text-muted">{offer.name}</p>
          <OfferForm action={action} submitLabel="Save changes" plans={plans} initial={offer} />
        </div>
      </div>
    </SuperAdminGate>
  );
}
