// Pure proposal generator. No database client, environment loading or writes to live configuration.
const fs = require('node:fs');
const PACKAGES = [
  ['brand','BRD',['brand']], ['inventory','INV',['inventory']],
  ['accounting-gst','GST',['accounting-gst','billing']], ['accounting','ACC',['accounting']],
  ['hrms','HRM',['hrms']], ['marketplace','MKT',['marketplace']],
  ['billing','BIL',['billing']], ['loyalty-rewards','LOY',['loyalty-rewards']],
];
function buildProposal(catalog, prices = null) {
  if (prices && (!Array.isArray(prices) || prices.length !== 3 || prices.some(n => !Number.isInteger(n) || n < 0))) throw new Error('Three reviewed non-negative monthly prices required');
  const changes = [];
  for (const [id,idPrefix,defaultModules] of PACKAGES) {
    const existing = catalog.types.find(t=>t.id===id);
    if (existing && existing.status !== 'Active') throw new Error(`Review inactive type ${id} manually`);
    if (existing?.planIds?.length) continue;
    const bundle = existing?.defaultModules ?? defaultModules;
    if (bundle.includes('service-centre')) throw new Error('Service Centre changes are forbidden');
    const plans = ['BASIC','PRO','ULTIMATE'].map((tier,index)=>({
      id:`PLAN-${id.toUpperCase().replaceAll('-','')}-${tier}`,
      name:['Starter','Pro','Ultimate'][index],price:prices?.[index]??null,
      billingCycle:'monthly',includedModuleSlugs:bundle,maxUsers:[2,10,9999][index],maxLocations:[1,3,9999][index],isPublic:true,
    }));
    for(const plan of plans) if(catalog.plans.some(p=>p.id===plan.id)) throw new Error(`Plan ${plan.id} already exists; review instead of overwriting`);
    changes.push({
      businessType:id,operation:existing?'link-plans-only':'create-business-type',
      expectedExisting:existing ? {status:existing.status,defaultModules:existing.defaultModules,planIds:existing.planIds} : null,
      type:existing?{planIds:plans.map(p=>p.id)}:{id,description:`Standalone ${id} business`,idPrefix,defaultModules,assignableRoleIds:['Owner / Admin'],planTierByPage:{},planIds:plans.map(p=>p.id),requiresApproval:false,customSignupFields:[],status:'Active'},
      plans,
    });
  }
  return { status:'UNPUBLISHED — human review required', pricing:prices?'Proposed monthly prices; review before publishing':'Unset — supply approved prices before publishing', changes,
    protected:['All existing Service Centre types, plans, accounts and access keys'],
    unresolved:['Service Centre Ultimate advertises Accounting/GST outside its bundle. Leave unchanged until a separately tested package transition is agreed.','Seat/location values describe catalog limits; confirm enforcement and commercial commitments before publication.'] };
}
module.exports = {buildProposal};
if(require.main===module){
 const report=JSON.parse(fs.readFileSync('docs/signup-catalog-audit-2026-10-06.json','utf8'));
 const prices=process.argv.includes('--standard-pricing')?[499,799,2499]:null;
 fs.writeFileSync('docs/signup-catalog-proposal-2026-10-07.json',JSON.stringify(buildProposal(report.catalog,prices),null,2)+'\n');
 console.log('Saved unpublished catalog proposal. No database accessed.');
}
