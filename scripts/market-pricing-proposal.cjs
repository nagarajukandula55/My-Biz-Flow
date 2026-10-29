// Pure generation: never opens a database or changes existing plans/subscriptions.
const fs = require('node:fs');
const policy = require('../data/module-pricing-2026-10.cjs');
const { buildProposal } = require('./signup-catalog-proposal.cjs');
// Read the same pure tier rules used by runtime. No app/database imports.
const ts = require('typescript');
const vm = require('node:vm');
const tierExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/designer/pageTiers.ts','utf8'), {
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText,{exports:tierExports});
const registeredPages = JSON.parse(fs.readFileSync('docs/partner-designer-catalog.json','utf8'));
function launchTierRecommendation(bundle, plans, overrides = {}) {
  const effective = {...tierExports.DEFAULT_PAGE_TIERS,...overrides};
  const evidence = registeredPages.filter(p=>!p.superAdminOnly && bundle.includes(p.moduleSlug) && ['pro','ultimate'].includes(effective[p.id]));
  return {
    evidenceBasis:'Registered non-admin pages in the actual module bundle, using DEFAULT_PAGE_TIERS plus stored type overrides. Page existence is candidate evidence; workflow and gate acceptance remain required.',
    tiers:plans.map((p,index)=>{
      const tier=tierExports.tierForPlanIndex(index,plans.length);
      const pages=evidence.filter(page=>effective[page.id]===tier).map(page=>({id:page.id,title:page.title,path:page.path}));
      return {planId:p.id,name:p.name,price:p.price,tier,status:tier==='basic'||pages.length?'CANDIDATE — acceptance required':'HOLD — no distinct built gated pages',incrementalPages:pages};
    }),
    publicationBlock:'Do not remove held plans from the type ladder blindly: tierForPlanIndex maps a two-plan top plan to Ultimate. This recommendation changes no plan IDs, order or runtime gates. A revised public ladder needs explicit mapping tests before publication; where no premium pages exist, a verified single Starter offer is sufficient.',
  };
}
function buildMarketProposal(catalog) {
  const missing = buildProposal(catalog);
  const changes = policy.modules.map(row => {
    if(row.slug === 'service-centre') throw new Error('Service Centre is protected');
    const existing = catalog.types.find(t=>t.id===row.slug);
    const draft = missing.changes.find(c=>c.businessType===row.slug) ?? (row.slug==='hotel' ? {type:{id:'hotel',description:'Hotel Management',idPrefix:'HTL',defaultModules:['hotel'],assignableRoleIds:['Owner / Admin'],planTierByPage:{},requiresApproval:false,customSignupFields:[]}} : row.slug==='interior-design' ? {type:{id:'interior-design',description:'Interior Design & Materials',idPrefix:'INT',defaultModules:['interior-design'],assignableRoleIds:['Owner / Admin'],planTierByPage:{},requiresApproval:false,customSignupFields:[]}} : undefined);
    const bundle = row.slug === "accounting" ? ["accounting", "accounting-gst", "billing"] : existing?.defaultModules ?? draft?.type.defaultModules;
    const existingFree = row.slug==='field-force' ? catalog.plans.find(p=>existing?.planIds.includes(p.id)&&p.price===0) : null;
    if(!bundle?.includes(row.slug) || bundle.includes('service-centre')) throw new Error(`Unsafe bundle: ${row.slug}`);
    const plans = row.prices.map((price,index)=>({
      id:`PLAN-${row.slug.toUpperCase().replaceAll('-','')}-202610-${row.slug==='field-force'?'FREE':['BASIC','PRO','ULTIMATE'][index]}`,
      name:row.slug==='field-force'?'Free':['Starter','Pro','Ultimate'][index], price, launchPrice:null,
      billingCycle:'monthly',includedModuleSlugs:bundle,maxUsers:existingFree?.maxUsers??[2,10,25][index],maxLocations:existingFree?.maxLocations??[1,3,5][index],isPublic:false,
    }));
    for(const p of plans) if(catalog.plans.some(old=>old.id===p.id)) throw new Error(`Version already exists: ${p.id}`);
    return {businessType:row.slug,operation:existing?'version-plans':'create-business-type',
      currentPlans:(existing?.planIds??[]).map(id=>catalog.plans.find(p=>p.id===id)??{id,missing:true}),
      expectedExisting:existing??null,
      // Publication is a separate reviewed operation; no active signup type is
      // pointed at private draft plans and new types cannot accidentally go live.
      proposedDefaultModules:bundle,
      draftType:existing?null:{...draft.type,defaultModules:bundle,status:'Inactive',planIds:plans.map(p=>p.id)},
      proposedPlanIds:plans.map(p=>p.id),plans,
      launchRecommendation:launchTierRecommendation(bundle,plans,existing?.planTierByPage),
      benchmark:policy.sources[row.source],scope:row.scope,limitation:row.limitation,
      tierPublicationPolicy:'All tiers remain private. Pro/Ultimate price points are conditional proposals, not verified seat, location, staff-role or support entitlements. Publish only after the promised differences are implemented and tested.',
      releaseGate:'Business workflow acceptance, tier/page mapping, seat/location enforcement, billing and provider-cost review',
    };
  });
  return {version:policy.version,checkedAt:policy.checkedAt,status:'PRICED — PRIVATE DRAFT, NOT PUBLISHED',currency:policy.currency,unit:policy.unit,tax:policy.tax,
    existingCustomerPolicy:'Keep all old plan rows and customer plan IDs unchanged. No automatic migration or renewal repricing.',
    fieldForcePolicy:'Free subscription and existing numeric capacity metadata retained; do not alter transaction-fee settings or advertise unverified unlimited capacity.',
    changes};
}
module.exports={buildMarketProposal,launchTierRecommendation};
if(require.main===module){
  const catalog=JSON.parse(fs.readFileSync('docs/pricing-catalog-audit-2026-10-07.json','utf8')).catalog;
  const proposal=buildMarketProposal(catalog);
  fs.writeFileSync('docs/market-pricing-proposal-2026-10-12.json',JSON.stringify(proposal,null,2)+'\n');
  const lines=['# Module pricing decisions — 12 October 2026','',
    'Prices are set in the local release proposal for 24 non-Service Centre business packages covering 25 internal modules, including Hotel added on 8 October. Nothing has been published or charged. Service Centre and all existing plan rows are excluded from changes.','',
    'INR per business per month, before applicable GST. Starter / Pro / Ultimate are proposed monthly rates, not annual-equivalent prices. Field Force remains free, with its existing separate transaction-fee configuration unchanged. No automatic launch-price increase is attached to these new versions.','',
    'These are conservative launch decisions based on current code scope and public competitor information, not a willingness-to-pay survey or a verified margin model. Competitor user/vehicle pricing is not directly equivalent to our business pricing. Foreign currencies are not converted. Where no reliable numeric benchmark was available, that limitation is explicit.','',
    '## Pricing changes after scope and market review','',
    'Reduced POS to 299/599/999, Brand to 699/1299/2499, Clinic to 399/699/999, Manufacturing to 599/1199/1999, Wholesale to 499/999/1799, Accounting + GST + Billing to 299/599/999, and Marketplace to 299/599/999. These reductions reflect narrower automation, integrations and role support than established suites. The remaining proposals are retained; additional local functionality alone does not justify raising rates before customer acceptance. Hotel and Rentals remain 499/999/1999 and 399/799/1499 respectively. HRMS remains 199/399/799 because statutory payroll is absent and a competitor offers a free tier.','',
    'All tiers remain private. Starter/Pro/Ultimate are price proposals, not claims that all listed scope is included in every tier. Current page gates must be checked per package. If a package has no distinct enforced premium features, offer one verified tier at launch and keep other price points unpublished. Higher-tier prices must not be justified by unsupported unlimited users, multiple properties, dedicated support or SLA promises. User and location fields alone do not enforce entitlements; employee attendance logins are not general operational staff seats.','',
    'Evidence was retrieved from official provider pages on 12 October 2026. Public prices may be localized or promotional. Fresha now returned MYR, so the former USD comparison is withdrawn. Practo was verified through the official page search result because direct extraction failed. The catalog baseline remains the read-only 7 October snapshot; refresh and compare it before any human publication.','',
    '## Prices and actual scope','',
    '| Module | Current stored monthly rates (launch rates in brackets) | New Starter / Pro / Ultimate | Current scope | Limitation / pricing rationale |','| --- | --- | --- | --- | --- |',
    ...proposal.changes.map(c=>`| ${c.businessType} | ${c.currentPlans.map(p=>p.price==null?'missing':`${p.price}${p.launchPrice!=null?` [${p.launchPrice}]`:''}`).join(' / ')||'No standalone plans'} | ${c.plans.map(p=>p.price).join(' / ')} | ${c.scope} | ${c.limitation} |`),'',
    'Current stored rates use the application’s monthly-rate convention even when the Plan billingCycle metadata says yearly. Checkout cycle discounts and tax are additional calculations. Existing Service Centre and Telecalling launch cutover rules are not modified. Accounting and GST are combined into one new signup package; existing internal routes, data and module access keys remain separate.','',
    '## Recommended launch tier candidates','',
    'Candidates below use registered pages from the actual bundle and the current default/stored page gates. They are not publication approval or a claim that every gate has passed end-to-end acceptance. A higher price needs distinct implemented features; capacity metadata and support promises do not qualify.','',
    '| Package | Candidate tiers | Held tiers | Incremental gated page evidence |','| --- | --- | --- | --- |',
    ...proposal.changes.map(c=>`| ${c.businessType} | ${c.launchRecommendation.tiers.filter(t=>t.status.startsWith('CANDIDATE')).map(t=>`${t.name}: INR ${t.price}`).join('; ')} | ${c.launchRecommendation.tiers.filter(t=>t.status.startsWith('HOLD')).map(t=>t.name).join(', ')||'None'} | ${c.launchRecommendation.tiers.filter(t=>t.incrementalPages.length).map(t=>`${t.name}: ${t.incrementalPages.map(p=>p.id).join(', ')}`).join('; ')||'No separate premium page in this bundle'} |`),'',
    'Do not simply drop held plans from the runtime ladder: its two-plan top entry resolves to Ultimate, not Pro. These recommendations preserve all draft IDs and ordering. A revised public ladder requires explicit tier-mapping tests before publication. Packages with no premium pages can use one verified Starter offer; other price points stay on hold. Bundled Billing, HRMS or Accounting can justify a premium candidate even when the primary vertical has no premium-only page.','',
    '## Verified market references','',
    ...Object.entries(policy.sources).map(([key,s])=>`- [${key}](${s.url}): ${s.benchmark}`),'',
    '## Publication gates','',
    '- The proposal creates new dated plan IDs; it never updates old prices or customer subscriptions. Draft plans are private and new business types inactive. Existing signup links remain unchanged until the reviewed publication operation.','- Starter/Pro/Ultimate differentiation must be verified against page access, seats and locations. Draft capacities are 2/10/25 users and 1/3/5 locations, not an unlimited promise. Field Force capacity needs separate review to preserve its current free offer.','- Bundles already configured for a vertical are preserved. Bundled HRMS/accounting/marketplace capabilities must pass acceptance too; standalone prices are not added to an existing bundle bill.','- Tax-filing, payroll compliance, provider delivery, settlements, offline support and integrations must not be advertised beyond verified implementation.','- Measure hosting, storage, message/provider usage and support cost before publication; these figures are not a profitability guarantee. Messaging and payment usage costs are separate from subscription prices.','- The repository forbids agents from mutating the shared live database. A human must review and apply the catalog change from their own terminal after the release gates pass.','',
    'Machine-readable release proposal: `market-pricing-proposal-2026-10-12.json`. Reproduce with `node scripts/market-pricing-proposal.cjs`; this command has no database connection.',''];
  fs.writeFileSync('docs/module-pricing-2026-10-12.md',lines.join('\n'));
  console.log(`Prepared ${proposal.changes.length} priced modules; no database access.`);
}
