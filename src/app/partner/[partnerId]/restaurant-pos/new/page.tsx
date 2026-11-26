import { redirect } from "next/navigation";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "restaurant-pos.create",
  moduleSlug: "restaurant-pos",
  title: "Restaurant POS - New Order",
  path: "/partner/[partnerId]/restaurant-pos/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Routes staff to the live table floor, where orders are created with configured menu items and kitchen tracking.",
  sourceFile: "src/app/partner/[partnerId]/restaurant-pos/new/page.tsx",
});

export default function NewRestaurantPosPage({ params }: { params: { partnerId: string } }) {
  redirect(`/partner/${params.partnerId}/restaurant-pos/tables`);
}
