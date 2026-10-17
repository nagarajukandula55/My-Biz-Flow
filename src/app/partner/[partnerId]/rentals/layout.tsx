import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { assertModuleAccess } from "@/lib/tenant";
export async function generateMetadata({ params }: { params: { partnerId: string } }): Promise<Metadata> {
  return { manifest: `/partner/${params.partnerId}/rentals/manifest.webmanifest`, appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Rentals" }, icons: { apple: [{ url: "/logo-mark.png" }] } };
}
export const viewport: Viewport = { themeColor: "#0B0F19" };
export default async function RentalsLayout({ children, params }: { children: ReactNode; params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  await assertModuleAccess(params.partnerId, "rentals");
  return <>{children}</>;
}
