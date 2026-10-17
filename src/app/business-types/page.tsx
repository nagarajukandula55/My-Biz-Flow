import Link from "next/link";
import type { Metadata } from "next";
import { PublicHeader } from "@/components/PublicHeader";
import { BUSINESS_OFFERINGS } from "@/lib/businessOfferings";
import { registerPage } from "@/lib/designer/registry";

export const metadata: Metadata={title:"Business types and features",description:"Explore workflows, features and availability for each My Biz Flow business package."};
registerPage({id:"platform.business-types",moduleSlug:"platform",title:"Business types",path:"/business-types",kind:"list",superAdminOnly:false,customizableRegions:[],explanation:"Public directory of business packages with detailed scope pages. Accounting and GST share one package. Roadmap features are not presented as available.",sourceFile:"src/app/business-types/page.tsx"});

export default function BusinessTypesPage(){
  return <div className="min-h-screen bg-bg text-text">
    <PublicHeader links={[{href:"/pricing",label:"Pricing"}]} />
    <main className="mbf-page space-y-8">
      <div><h1 className="font-display text-3xl font-bold">Find your business workspace</h1><p className="mt-3 max-w-prose text-text-muted">See the workflows, management tools and current limits of each package before registering. Available features depend on the modules and plan enabled for your account.</p></div>
      <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">{BUSINESS_OFFERINGS.map(o=><li key={o.slug} className="min-w-0 border-b border-border pb-6"><h2 className="font-display text-xl font-bold"><Link className="inline-flex min-h-11 items-center text-teal underline" href={`/business-types/${o.slug}`}>{o.title}</Link></h2><p className="mt-2 break-words text-sm text-text-muted">{o.summary}</p></li>)}</ul>
      <section><h2 className="font-display text-xl font-bold">Hotel management</h2><p className="mt-2 max-w-prose text-text-muted">The hotel workspace covers room reservations, guest stays, housekeeping and folio records. Launch acceptance is pending; booking-channel integrations and online payment processing are not included.</p><Link className="mt-3 inline-flex min-h-11 items-center text-teal underline" href="/business-types/hotel">Review hotel features and current limits</Link></section>
    </main>
  </div>;
}
