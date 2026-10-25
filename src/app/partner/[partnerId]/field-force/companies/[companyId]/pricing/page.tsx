import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { prisma } from "@/lib/prisma";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { getCompany } from "@/lib/fieldForce/companiesData";
import { listServices } from "@/lib/fieldForce/servicesData";
import { createCompanyVariantAction, setCompanyVariantPriceAction } from "@/lib/fieldForce/actions";

registerPage({ id: "field-force.company-pricing", moduleSlug: "field-force", title: "Field Force — Company Pricing", path: "/partner/[partnerId]/field-force/companies/[companyId]/pricing", kind: "other", superAdminOnly: false, customizableRegions: [], explanation: "Company-specific device variants and service pricing.", sourceFile: "src/app/partner/[partnerId]/field-force/companies/[companyId]/pricing/page.tsx" });

export const dynamic = "force-dynamic";

export default async function CompanyPricingPage({ params }: { params: { partnerId: string; companyId: string } }) {
  const partnerId = await requireSessionPartnerId(params.partnerId);
  const company = await getCompany(params.companyId, partnerId);
  if (!company) return null;
  const [variants, services] = await Promise.all([
    prisma.fieldForceCompanyVariant.findMany({ where: { companyId: company.id }, include: { prices: { include: { service: true }, orderBy: { effectiveFrom: "desc" } } }, orderBy: [{ brand: "asc" }, { model: "asc" }, { variant: "asc" }] }),
    listServices(),
  ]);
  return <AppShell topbarTitle="Company Pricing"><div className="mbf-page space-y-6"><div><h1 className="font-display text-2xl font-bold text-text">{company.name} device pricing</h1><p className="mt-1 text-sm text-text-muted">Set a separate customer price, provider payout and platform margin for each device variant and service.</p></div>
    <form action={createCompanyVariantAction.bind(null, partnerId)} className="grid gap-3 rounded-lg border border-border bg-bg-raised p-4 sm:grid-cols-4"><input type="hidden" name="companyId" value={company.id} /><input name="brand" required placeholder="Brand" className="rounded border border-border bg-bg px-3 py-2 text-sm" /><input name="model" required placeholder="Model" className="rounded border border-border bg-bg px-3 py-2 text-sm" /><input name="variant" required placeholder="Variant" className="rounded border border-border bg-bg px-3 py-2 text-sm" /><button className="btn-accent text-sm">Add variant</button></form>
    <div className="space-y-4">{variants.map((variant) => <div key={variant.id} className="rounded-lg border border-border bg-bg-raised p-4"><h2 className="font-display font-bold text-text">{variant.brand} · {variant.model} · {variant.variant}</h2><form action={setCompanyVariantPriceAction.bind(null, partnerId)} className="mt-3 grid gap-3 sm:grid-cols-4"><input type="hidden" name="variantId" value={variant.id} /><select name="serviceId" required className="rounded border border-border bg-bg px-3 py-2 text-sm"><option value="">Service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select><input name="customerPrice" type="number" min="0" step="0.01" required placeholder="Customer price ₹" className="rounded border border-border bg-bg px-3 py-2 text-sm" /><input name="providerPayout" type="number" min="0" step="0.01" required placeholder="Provider payout ₹" className="rounded border border-border bg-bg px-3 py-2 text-sm" /><button className="btn-outline text-sm">Save price</button></form>{variant.prices.length > 0 && <div className="mt-3 space-y-1 text-xs text-text-muted">{variant.prices.map((price) => <div key={price.id}>{price.service.name}: ₹{(price.customerPrice / 100).toLocaleString("en-IN")} customer · ₹{(price.providerPayout / 100).toLocaleString("en-IN")} provider · ₹{(price.platformMargin / 100).toLocaleString("en-IN")} margin</div>)}</div>}</div>)}</div>
  </div></AppShell>;
}
