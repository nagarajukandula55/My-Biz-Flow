const assert = require('node:assert/strict');
const test = require('node:test');
const load = require('./loadModule.cjs');

test('rental refunds use actual receipts, retain damage and reject duplicate or excessive refunds',()=>{
 const {rentalSettlement,validateRentalPayment}=load('src/lib/rentalSettlement.ts');
 const booking={rentalAmount:10000,depositAmount:50000,damageCharge:10000,returned:true,status:'Completed'};
 const entry=(kind,amount,reference=kind)=>({kind,amount,reference,note:'',at:'2026-10-09T00:00:00Z'});
 assert.equal(rentalSettlement(booking,[]).depositRefundDue,0);
 const receipts=[entry('Deposit receipt',30000)];
 assert.equal(rentalSettlement(booking,receipts).depositRefundDue,20000);
 assert.throws(()=>validateRentalPayment(booking,receipts,entry('Deposit refund',20001)),/balance/);
 const refund=entry('Deposit refund',20000);assert.equal(validateRentalPayment(booking,receipts,refund),true);
 receipts.push(refund);assert.equal(rentalSettlement(booking,receipts).depositRefundDue,0);
 assert.equal(validateRentalPayment(booking,receipts,refund),false);
 assert.throws(()=>validateRentalPayment(booking,receipts,{...refund,amount:1}),/reference/);
 assert.equal(rentalSettlement(booking,receipts).retained,10000);
 assert.throws(()=>validateRentalPayment(booking,receipts,entry('Rental refund',1)),/balance/);
 const cancelled={...booking,returned:false,status:'Cancelled'};
 assert.equal(rentalSettlement(cancelled,[entry('Rental receipt',5000)]).rentalRefundDue,5000);
 assert.throws(()=>validateRentalPayment(cancelled,[],entry('Rental receipt',1)),/balance/);
 assert.equal(rentalSettlement(booking,[]).damageDue,10000);
 assert.throws(()=>validateRentalPayment(booking,[entry('Damage receipt',10000)],entry('Deposit receipt',10000)),/balance/);
 for(const amount of [0,-1,1.5,NaN,Infinity,2147483648]) assert.throws(()=>validateRentalPayment(booking,[],entry('Rental receipt',amount)),/valid/);
});

test('rental line pricing distinguishes inherited amounts from zero and rejects unsafe values',()=>{
 const {rentalLineAmount}=load('src/lib/rentalTerms.ts');
 assert.equal(rentalLineAmount({},'a','deposit',50000),50000);
 assert.equal(rentalLineAmount({'line:a:deposit':''},'a','deposit',50000),50000);
 assert.equal(rentalLineAmount({'line:a:deposit':0},'a','deposit',50000),0);
 assert.equal(rentalLineAmount({'line:a:rate':'12.50'},'a','rate',50000),1250);
 for(const value of [-1,Infinity,'invalid',{},21474836.48]) assert.throws(()=>rentalLineAmount({'line:a:fixed':value},'a','fixed',50000),/valid/);
 assert.equal(rentalLineAmount({'line:other:fixed':100},'a','fixed',50000),50000);
});

test('rental quotes round periods up, reject invalid amounts and support all categories without claiming pooled stock',()=>{
 const rules=load('src/lib/rentalTerms.ts');
 const start=new Date('2030-01-01T00:00:00Z'),end=new Date('2030-01-01T01:30:00Z');
 for(const category of rules.RENTAL_CATEGORIES){
  const terms=rules.readRentalTerms({rentalCategory:category,rateUnit:'Hourly',rateRupees:125});
  assert.equal(rules.rentalQuote(terms,start,end,0),25000);
 }
 const fixed=rules.readRentalTerms({});assert.equal(rules.rentalQuote(fixed,start,end,9900),9900);
 assert.throws(()=>rules.rentalQuote(fixed,end,start,9900),/End must/);
 assert.throws(()=>rules.readRentalTerms({rateRupees:Infinity}),/valid rental rate/);
 assert.throws(()=>rules.readRentalTerms({rentalCategory:'unknown'}),/valid rental category/);
 assert.throws(()=>rules.rentalQuote(rules.readRentalTerms({rateUnit:'Daily'}),start,end,0),/positive rate/);
});

test('all business packages have detailed content and Accounting/GST has one canonical page',()=>{
 const modules=load('src/lib/designer/modules.ts');
 const profiles=load('src/lib/workspaceProfiles.ts',{'@/lib/designer/modules':modules});
 const catalog=load('src/lib/businessOfferings.ts',{'@/lib/designer/modules':modules,'@/lib/workspaceProfiles':profiles,'@/data/business-offering-scope.json':require('../src/data/business-offering-scope.json')});
 assert.equal(catalog.BUSINESS_OFFERINGS.length,25);
 for(const o of catalog.BUSINESS_OFFERINGS){assert.ok(o.workflow.length>=3&&o.summary&&o.limitation,o.slug);assert.ok(o.features.length>0,o.slug);}
 assert.equal(catalog.getBusinessOffering('accounting-gst').slug,'accounting');
 assert.equal(catalog.getBusinessOffering('unknown'),undefined);
 assert.equal(catalog.getBusinessOffering('hotel').slug,'hotel');
});
test('signup rejects unavailable types and invalid fields before provisioning; distinguishes duplicate contacts', async()=>{
 let type={status:'Inactive',customSignupFields:[]},writes=0,failure=null,signingFailure=false;
 const api=load('src/app/signup/actions.ts',{
  'next/headers':{cookies:()=>({set(){}})},'next/navigation':{redirect:path=>{throw new Error('REDIRECT '+path);}},
  '@/lib/signupProvisioning':{provisionSignup:async()=>{writes++;if(failure)throw failure;return {id:'TEST0001'};}},
  '@/lib/designer/partnerTypesData':{getPartnerType:async()=>type},'@/lib/referrals':{resolveReferrer:async()=>undefined},
  '@/lib/plansData':{getPlan:async()=>undefined},'@/lib/partnerData':{getPartner:async()=>null,updatePartnerSubscription:async()=>{}},
  '@/lib/email':{sendPartnerWelcomeEmail:async()=>{}},'@/lib/partnerSession':{createPartnerSessionToken:async()=>{if(signingFailure)throw new Error('signing unavailable');return 'test-token';}},
  '@/lib/platformSettings':{notifyAdmins:async()=>{}},'@/lib/telegramTemplates':{newPartnerApplicationMessage:async()=>''},
 },{process:{env:{NODE_ENV:'test'}}});
 const form=new FormData();for(const key of ['partnerTypeId','businessName','city','state','pincode','businessEmail','businessContact','loginContact'])form.set(key,'Test');
 await assert.rejects(api.registerBusiness(form),/not accepting/);assert.equal(writes,0);
 type={status:'Active',customSignupFields:[{key:'size',type:'select',label:'Size',options:['Small'],required:true}]};
 form.set('custom_size','Invalid');await assert.rejects(api.registerBusiness(form),/Invalid choice/);assert.equal(writes,0);
 form.set('custom_size','Small');signingFailure=true;await assert.rejects(api.registerBusiness(form),/signing unavailable/);assert.equal(writes,0);
 signingFailure=false;failure={code:'P2002',meta:{target:['loginContact']}};await assert.rejects(api.registerBusiness(form),/contact_taken/);
 failure=new Error('database failure');await assert.rejects(api.registerBusiness(form),/registration_failed/);
 failure=null;await assert.rejects(api.registerBusiness(form),/change-password\?welcome=1/);
});

test('catalog proposal fills eight gaps without rewriting existing bundles or Service Centre',()=>{
 const {buildProposal}=require('../scripts/signup-catalog-proposal.cjs');
 const catalog=require('../docs/signup-catalog-audit-2026-10-06.json').catalog;
 const before=JSON.stringify(catalog),proposal=buildProposal(catalog,[499,799,2499]);
 assert.equal(proposal.changes.length,8);
 assert.equal(proposal.changes.filter(c=>c.operation==='create-business-type').length,6);
 assert.ok(proposal.changes.every(c=>!c.plans.some(p=>p.includedModuleSlugs.includes('service-centre'))));
 assert.ok(proposal.changes.filter(c=>c.operation==='link-plans-only').every(c=>Object.keys(c.type).join(',')==='planIds'));
 assert.equal(JSON.stringify(catalog),before);
 const projected=structuredClone(catalog);
 for(const change of proposal.changes){projected.plans.push(...change.plans);if(change.expectedExisting)Object.assign(projected.types.find(t=>t.id===change.businessType),change.type);else projected.types.push(change.type);}
 const modules=load('src/lib/designer/modules.ts').MODULES;
 assert.equal(modules.filter(m=>projected.types.some(t=>t.id===m.slug&&t.status==='Active'&&t.defaultModules.includes(m.slug))).length,25);
 assert.ok(projected.types.filter(t=>t.status==='Active').every(t=>t.planIds.length));
});

test('market pricing covers all modules through 24 packages and preserves existing customers and Service Centre',()=>{
 const {buildMarketProposal}=require('../scripts/market-pricing-proposal.cjs');
 const policy=require('../data/module-pricing-2026-10.cjs');
 const catalog=require('../docs/pricing-catalog-audit-2026-10-07.json').catalog;
 const before=JSON.stringify(catalog),proposal=buildMarketProposal(catalog);
 const expected=load('src/lib/designer/modules.ts').MODULES.map(m=>m.slug).filter(s=>s!=='service-centre'&&s!=='accounting-gst').sort();
 assert.deepEqual(proposal.changes.map(c=>c.businessType).sort(),Array.from(expected));
 assert.equal(JSON.stringify(catalog),before);
 assert.deepEqual(proposal.changes.find(c=>c.businessType==='accounting').proposedDefaultModules,['accounting','accounting-gst','billing']);
 const existingIds=new Set(catalog.plans.map(p=>p.id));
 for(const c of proposal.changes){
  assert.ok(c.benchmark.url.startsWith('https://'));
  assert.ok(c.scope&&c.limitation&&c.releaseGate);
  assert.ok(c.plans.every(p=>!existingIds.has(p.id)&&!p.isPublic&&p.launchPrice===null&&Number.isInteger(p.price)&&p.price>=0&&!p.includedModuleSlugs.includes('service-centre')));
  assert.equal(c.proposedPlanIds.length,c.plans.length);
  if(c.draftType)assert.equal(c.draftType.status,'Inactive');
 }
 assert.equal(proposal.changes.find(c=>c.businessType==='field-force').plans[0].price,0);
 assert.equal(new Set(policy.modules.map(m=>m.prices.join(','))).size>5,true);
 const unsafe=structuredClone(catalog);unsafe.types.find(t=>t.id==='clinic').defaultModules.push('service-centre');
 assert.throws(()=>buildMarketProposal(unsafe),/Unsafe bundle/);
 const collision=structuredClone(catalog);collision.plans.push(proposal.changes[0].plans[0]);
 assert.throws(()=>buildMarketProposal(collision),/Version already exists/);
});
