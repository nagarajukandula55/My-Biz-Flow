import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { listPlans } from "@/lib/plansData";
import { OfferForm } from "../OfferForm";
import { createOfferAction } from "../actions";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.offers.create",
  moduleSlug: "platform",
  title: "Offers — Create",
  path: "/admin/offers/new",
  kind: "form",
  superAdminOnly: true,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Creation form for a new discount/combo Offer. Writes to the Offer Prisma table.",
  sourceFile: "src/app/admin/(protected)/offers/new/page.tsx",
});

export default async function NewOfferPage() {
  const plans = await listPlans();

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">New Offer</h1>
        </div>
        <div className="p-6">
          <OfferForm action={createOfferAction} submitLabel="Create Offer" plans={plans} />
        </div>
      </div>
    </SuperAdminGate>
  );
}
