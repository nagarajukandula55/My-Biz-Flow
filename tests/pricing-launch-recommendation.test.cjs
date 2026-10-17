const test=require('node:test');
const assert=require('node:assert/strict');
const {buildMarketProposal,launchTierRecommendation}=require('../scripts/market-pricing-proposal.cjs');
const catalog=require('../docs/pricing-catalog-audit-2026-10-07.json').catalog;
const load=require('./loadModule.cjs');

test('premium recommendations require registered gated pages in the actual bundle',()=>{
  const proposal=buildMarketProposal(catalog);
  const hotel=proposal.changes.find(c=>c.businessType==='hotel');
  assert.ok(hotel.launchRecommendation.tiers.slice(1).every(t=>t.status.startsWith('HOLD')));
  const accounting=proposal.changes.find(c=>c.businessType==='accounting');
  assert.ok(accounting.launchRecommendation.tiers[1].incrementalPages.some(p=>p.id==='accounting.reports.trial-balance'));
  assert.ok(accounting.launchRecommendation.tiers[2].incrementalPages.some(p=>p.id==='billing.expenses.list'));
  const reserved=launchTierRecommendation(['hotel'],hotel.plans,{'hotel.unbuilt': 'ultimate','billing.expenses.list':'ultimate'});
  assert.ok(reserved.tiers.slice(1).every(t=>t.status.startsWith('HOLD')));
  const field=proposal.changes.find(c=>c.businessType==='field-force');
  assert.equal(field.launchRecommendation.tiers.length,1);
  assert.equal(field.launchRecommendation.tiers[0].price,0);
  assert.match(hotel.launchRecommendation.publicationBlock,/two-plan top plan to Ultimate/);
  assert.ok(proposal.changes.every(c=>c.plans.every(p=>p.isPublic===false)));
});

test('private launch IDs keep explicit tiers when a package has one candidate',()=>{
  const {tierForPlan}=load('src/lib/designer/pageTiers.ts');
  assert.equal(tierForPlan('MBF-LAUNCH-20261013-hotel-basic',0,1),'basic');
  assert.equal(tierForPlan('MBF-LAUNCH-20261013-billing-pro',0,2),'pro');
  assert.equal(tierForPlan('LEGACY-PLAN',0,2),'basic');
  assert.equal(tierForPlan('LEGACY-PLAN',1,2),'ultimate');
});
