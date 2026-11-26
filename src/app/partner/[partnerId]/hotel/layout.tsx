import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { assertModuleAccess } from "@/lib/tenant";
export async function generateMetadata({params}:{params:{partnerId:string}}):Promise<Metadata>{return {manifest:`/partner/${params.partnerId}/hotel/manifest.webmanifest`,appleWebApp:{capable:true,statusBarStyle:"black-translucent",title:"Hotel Desk"},icons:{apple:[{url:"/logo-mark.png"}]}};}
export const viewport:Viewport={themeColor:"#1A63BD",width:"device-width",initialScale:1};
export default async function HotelLayout({children,params}:{children:ReactNode;params:{partnerId:string}}) {
  await requireSessionPartnerId(params.partnerId);
  await assertModuleAccess(params.partnerId,"hotel");
  return <>{children}</>;
}
