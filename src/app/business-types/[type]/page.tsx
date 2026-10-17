import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PublicHeader } from "@/components/PublicHeader";
import { getBusinessOffering } from "@/lib/businessOfferings";
import { listActivePartnerTypes } from "@/lib/designer/partnerTypesData";
import { registerPage } from "@/lib/designer/registry";

export const dynamic="force-dynamic";
registerPage({id:"platform.business-types.detail",moduleSlug:"platform",title:"Business package details",path:"/business-types/[type]",kind:"detail",superAdminOnly:false,customizableRegions:[],explanation:"Responsive public package details: actual workflows, feature areas, settings, reports, limitations and signup availability. Reads published catalog only; draft pricing is never shown.",sourceFile:"src/app/business-types/[type]/page.tsx"});
export function generateMetadata({params}:{params:{type:string}}):Metadata {
  const o=getBusinessOffering(params.type);
  return {title:o?`${o.title} features`:"Business package",description:o?.summary};
}
export default async function BusinessTypePage({params,searchParams}:{params:{type:string};searchParams:{ref?:string}}){
  const o=getBusinessOffering(params.type); if(!o)notFound();
  const referral=searchParams.ref?`?ref=${encodeURIComponent(searchParams.ref)}`:'';
  if(params.type!==o.slug)redirect(`/business-types/${o.slug}${referral}`);
  const types=await listActivePartnerTypes();
  const type=types.find(candidate => o.modules.every(module => candidate.defaultModules.includes(module)));
  const available=Boolean(type);
  return <div className="min-h-screen bg-bg text-text">
    <PublicHeader showCta={false} links={[{href:"/business-types",label:"All business types"}]} />
    <main className="mbf-page min-w-0 space-y-10">
      <header><p className="text-sm font-semibold text-teal">Business workspace</p><h1 className="mt-2 break-words font-display text-3xl font-bold sm:text-4xl">{o.title}</h1><p className="mt-4 max-w-prose text-text-muted">{o.summary}</p><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{available?<Link className="btn-accent min-h-11 justify-center" href={`/signup/${type!.id}${referral}`}>Register your business</Link>:<Link className="btn-outline min-h-11 justify-center" href="/contact">Ask about availability</Link>}<Link className="btn-outline min-h-11 justify-center" href="/pricing">View published plans</Link></div><p className="mt-3 text-sm text-text-muted">{available?'Registration is available. Confirm your required workflows and plan features before subscribing.':'This package is awaiting signup configuration or release review. It is not open for registration from this page.'}</p></header>
      <div className="grid min-w-0 grid-cols-1 gap-10 lg:grid-cols-2">
        <section><h2 className="font-display text-xl font-bold">How your team works</h2><ol className="mt-4 list-decimal space-y-3 pl-6">{o.workflow.map(step=><li key={step}>{step}</li>)}</ol></section>
        <section><h2 className="font-display text-xl font-bold">Tools in this workspace</h2><ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">{o.features.map(feature=><li className="break-words border-b border-border pb-2 text-sm" key={feature}>{feature}</li>)}</ul><p className="mt-3 text-sm text-text-muted">These are the workspace's feature areas. Plan permissions and enabled modules determine access; listing a tool does not include an external service or integration automatically.</p></section>
        <section><h2 className="font-display text-xl font-bold">Settings and reporting</h2><p className="mt-3 text-text-muted">Manage {o.settings.length?o.settings.join(', ').toLowerCase():'your business setup and module preferences'}. Account settings and available reports follow your enabled modules.</p><p className="mt-3 text-text-muted">{o.metrics.length?`Operational dashboard totals cover ${o.metrics.join(', ').toLowerCase()}.`:'Use the reports available within this workspace.'} Operational totals are current snapshots; detailed financial reports are available only where implemented.</p><p className="mt-3 text-text-muted">Telegram report choices follow enabled modules. Alert options are limited to implemented events and require a connected chat.</p></section>
        <section><h2 className="font-display text-xl font-bold">What to check before choosing</h2><p className="mt-3 max-w-prose text-text-muted">{o.limitation}</p>{o.slug==='hrms'&&<p className="mt-3 text-text-muted">Employees can use dedicated attendance logins with configurable office geofences. Facial recognition, address lookup and continuous location tracking are not included.</p>}{o.slug==='rentals'&&<p className="mt-3 text-text-muted">Book assets individually or together, with quantity pools, partial pickups and returns, inspection notes and manual payment corrections. Driver verification, fuel/mileage billing, inspection attachments and property lease automation are not included.</p>}</section>
      </div>
      <section className="border-t border-border pt-6"><h2 className="font-display text-xl font-bold">Mobile and web access</h2><p className="mt-3 max-w-prose text-text-muted">This information page adapts to phone, tablet and desktop screens. The workspace is delivered through the web application; some detailed reports use horizontally scrolling tables. Dedicated Android and iOS applications are planned and are not included as released apps. Camera, location, notifications and offline support will be listed only after device testing.</p></section>
      <section><h2 className="font-display text-xl font-bold">Getting started</h2><p className="mt-3 max-w-prose text-text-muted">Check the package availability and published plan, register your business, set your password and complete the relevant masters and settings. Confirm staff permissions, opening balances or stock, and one complete business transaction before using the workspace for daily operations.</p><Link href="/contact" className="mt-3 inline-flex min-h-11 items-center text-teal underline">Discuss a requirement not listed here</Link></section>
    </main>
  </div>;
}
