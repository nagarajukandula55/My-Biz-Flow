import { redirect } from "next/navigation";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "restaurant-pos.edit",
  moduleSlug: "restaurant-pos",
  title: "Restaurant POS - Edit Order",
  path: "/partner/[partnerId]/restaurant-pos/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Routes staff to the live order screen. Order lines and payment state are changed through the table workflow to preserve KOT and billing history.",
  sourceFile: "src/app/partner/[partnerId]/restaurant-pos/[recordId]/edit/page.tsx",
});

export default function EditRestaurantPosPage({ params }: { params: { partnerId: string; recordId: string } }) {
  redirect(`/partner/${params.partnerId}/restaurant-pos/${params.recordId}`);
}
