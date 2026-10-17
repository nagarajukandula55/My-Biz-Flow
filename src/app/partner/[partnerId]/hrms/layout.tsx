import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { assertModuleAccess } from "@/lib/tenant";
export async function generateMetadata({ params }: { params: { partnerId: string } }): Promise<Metadata> {
  return { manifest: `/partner/${params.partnerId}/hrms/manifest.webmanifest`, appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "HRMS" } };
}
export const viewport: Viewport = { themeColor: "#0B0F19" };
export default async function HrmsLayout({ children, params }: { children: ReactNode; params: { partnerId: string } }) {
  // Employee sign-in has its own purpose-bound session. All other HRMS
  // pages require a business session and an active HRMS entitlement.
  if (headers().get("x-pathname") !== `/partner/${params.partnerId}/hrms/employee`) {
    await requirePartnerSessionForPage(params.partnerId);
    await assertModuleAccess(params.partnerId, "hrms");
  }
  return <>{children}</>;
}
