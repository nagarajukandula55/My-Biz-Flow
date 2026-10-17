// Local artifacts only. Never imports Prisma or connects to a database.
const fs=require('node:fs');
const {buildMarketProposal}=require('./market-pricing-proposal.cjs');
function buildPrivateLaunchCatalog(catalog){
 const proposal=buildMarketProposal(catalog);
 const planTiers={};
 const changes=proposal.changes.map(change=>{
  const candidates=change.launchRecommendation.tiers.filter(t=>t.status.startsWith('CANDIDATE'));
  const plans=candidates.map(candidate=>{
   const original=change.plans.find(p=>p.id===candidate.planId);
   const id=`MBF-LAUNCH-20261013-${change.businessType}-${candidate.tier}`;
   if(catalog.plans.some(p=>p.id===id))throw Error('Release ID already exists: '+id);
   planTiers[id]=candidate.tier;
   return {...original,id,isPublic:false};
  });
  return {businessType:change.businessType,expectedExisting:change.expectedExisting,plans,
   proposedPlanIds:plans.map(p=>p.id),proposedDefaultModules:change.proposedDefaultModules,
   draftType:change.draftType?{...change.draftType,status:'Inactive',planIds:plans.map(p=>p.id)}:null,
   heldTiers:change.launchRecommendation.tiers.filter(t=>t.status.startsWith('HOLD')).map(t=>t.tier),
   publicationGate:'Private candidates only. Workflow acceptance and human publication review required; no capacity or staff-role promises.'};
 });
 return {version:'2026-10-13',status:'PRIVATE — NOT APPLIED',existingCustomerPolicy:proposal.existingCustomerPolicy,planTiers,changes};
}
module.exports={buildPrivateLaunchCatalog};
if(require.main===module){
 const catalog=JSON.parse(fs.readFileSync('docs/pricing-catalog-audit-2026-10-07.json','utf8')).catalog;
 const release=buildPrivateLaunchCatalog(catalog);
 fs.writeFileSync('docs/private-launch-catalog-2026-10-13.json',JSON.stringify(release,null,2)+'\n');
 console.log(`Prepared ${release.changes.length} private packages; held tiers excluded; no database access.`);
}
