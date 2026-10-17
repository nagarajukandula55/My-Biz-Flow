import type { ReactNode } from "react";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { assertModuleAccess } from "@/lib/tenant";
export default async function HotelLayout({children,params}:{children:ReactNode;params:{partnerId:string}}) {
  await requireSessionPartnerId(params.partnerId);
  await assertModuleAccess(params.partnerId,"hotel");
  return <>{children}</>;
}
