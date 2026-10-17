const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const load = require('./loadModule.cjs');
const url = 'postgresql://ci:ci@127.0.0.1:55439/ci';
if (process.env.MBF_ISOLATED_TEST !== '1' || process.env.DATABASE_URL !== url || process.env.DATABASE_URL_UNPOOLED !== url) throw Error('Only the disposable local launch database is permitted');
const base = new (require('@prisma/client').PrismaClient)({datasources:{db:{url}}});
const db = load('src/lib/databaseTransaction.ts', {'node:async_hooks':require('node:async_hooks'),'@/lib/databaseClientContext':load('src/lib/databaseClientContext.ts')});
const prisma = db.transactionAwareClient(base);
const lock = load('src/lib/withRecordLock.ts', {'@/lib/prisma':{prisma},'@/lib/databaseTransaction':db});
const prefix = 'SL'+crypto.randomBytes(6).toString('hex');
const modules = load('src/lib/designer/modules.ts');
const signup = load('src/lib/signupProvisioning.ts', {'crypto':crypto,'@/lib/prisma':{prisma},'@/lib/withRecordLock':lock,'@/lib/passwords':load('src/lib/passwords.ts',{'crypto':crypto}),'@/lib/catalog/productDomains':load('src/lib/catalog/productDomains.ts'),'@/lib/designer/modules':modules});
const keys = load('src/lib/designer/accessKeys.ts', {'crypto':crypto,'@/lib/prisma':{prisma}});
const partnerData = {getPartner:id=>prisma.partner.findUnique({where:{id}})};
const typeData = {getPartnerType:id=>prisma.partnerType.findUnique({where:{id}})};
const visibility = load('src/lib/designer/entitlements.ts', {'@/lib/safeCache':{safeCache:fn=>fn},'@/lib/designer/moduleRegistry':{getModule:slug=>modules.MODULES.find(m=>m.slug===slug)},'@/lib/designer/accessKeys':keys,'@/lib/partnerData':partnerData,'@/lib/designer/partnerTypesData':typeData});
const tenant = load('src/lib/tenant.ts', {'@/lib/designer/accessKeys':keys,'@/lib/partnerData':partnerData,'@/lib/designer/partnerTypesData':typeData,'@/lib/plansData':{listPlans:()=>prisma.plan.findMany({orderBy:{price:'asc'}})},'@/lib/designer/pageTiers':load('src/lib/designer/pageTiers.ts')});
async function register(slug, included) {
 const id=prefix+'-'+slug;
 await prisma.partnerType.create({data:{id,idPrefix:prefix,status:'Active',defaultModules:included,assignableRoleIds:['Owner']}});
 return signup.provisionSignup({partnerTypeId:id,businessName:'Synthetic launch signup',addressLine:'Test',city:'Test',state:'Test',pincode:'000000',businessEmail:'test@example.invalid',businessContact:'Test',loginContact:id});
}
test('every commercial package exposes only its own provisioned modules; revocation and pending requests fail closed', async()=>{
 const offerings=modules.MODULES.filter(m=>m.slug!=='accounting-gst');
 assert.equal(offerings.length,25);
 for(const module of offerings){
  const included=module.slug==='accounting'?['accounting','accounting-gst','billing']:[module.slug];
  const p=await register(module.slug,included);
  assert.deepEqual(Array.from(await visibility.getVisibleModuleSlugs(p.id)).sort(),included.slice().sort());
  for(const slug of included) await tenant.assertModuleAccess(p.id,slug);
  await keys.revokeAccessKey(p.id,module.slug);
  await assert.rejects(tenant.assertModuleAccess(p.id,module.slug),/Module access denied/);
  assert.ok(!(await visibility.getVisibleModuleSlugs(p.id)).includes(module.slug));
  await keys.requestAccessKey(p.id,module.slug);
  await assert.rejects(tenant.assertModuleAccess(p.id,module.slug),/Module access denied/);
  assert.ok(!(await visibility.getVisibleModuleSlugs(p.id)).includes(module.slug));
  await keys.issueAccessKey(p.id,module.slug);
  await tenant.assertModuleAccess(p.id,module.slug);
  assert.ok((await visibility.getVisibleModuleSlugs(p.id)).includes(module.slug));
  const unrelated=module.slug==='clinic'?'rentals':'clinic';
  await assert.rejects(tenant.assertModuleAccess(p.id,unrelated),/Module access denied/);
  await assert.rejects(tenant.assertModuleAccess(p.id+'-unknown',module.slug),/Module access denied/);
 }
});
test('Accounting bundle trial, Starter and Pro enforce actual report gates without losing Billing or GST access',async()=>{
 const p=await register('tier-accounting',['accounting','accounting-gst','billing']);
 const planIds=[0,1,2].map(i=>prefix+'-plan-'+i);
 await prisma.plan.createMany({data:planIds.map((id,i)=>({id,name:'Synthetic '+i,price:100*(i+1),billingCycle:'monthly',includedModuleSlugs:['accounting','accounting-gst','billing'],maxUsers:1,maxLocations:1,isPublic:false}))});
 await prisma.partnerType.update({where:{id:prefix+'-tier-accounting'},data:{planIds}});
 const report='accounting.reports.trial-balance';
 assert.equal((await tenant.getPageTierAccess(p.id,report)).heldTier,'ultimate');
 await prisma.partner.update({where:{id:p.id},data:{planId:planIds[0],subscriptionStatus:'Active'}});
 await assert.rejects(tenant.assertPageTierAccess(p.id,report),/Plan tier too low/);
 for(const slug of ['accounting','accounting-gst','billing']) await tenant.assertModuleAccess(p.id,slug);
 await prisma.partner.update({where:{id:p.id},data:{planId:planIds[1]}});
 await tenant.assertPageTierAccess(p.id,report);
 await prisma.partner.update({where:{id:p.id},data:{planId:null,subscriptionStatus:'Trial',trialEndAt:new Date('2020-01-01')}});
 await assert.rejects(tenant.assertPartnerCanWrite(p.id),/free trial has ended/);
 assert.equal((await visibility.getVisibleModuleSlugs(p.id)).length,3,'expired trial retains read visibility');
});
test.after(async()=>{
 await base.businessRecord.deleteMany({where:{partnerId:{startsWith:prefix}}});
 await base.moduleAccessKey.deleteMany({where:{partnerId:{startsWith:prefix}}});
 await base.partner.deleteMany({where:{id:{startsWith:prefix}}});
 await base.partnerType.deleteMany({where:{id:{startsWith:prefix}}});
 await base.plan.deleteMany({where:{id:{startsWith:prefix}}});
 await base.numberingCounter.deleteMany({where:{scopeKey:'signup-prefix:'+prefix}});
 await base.$disconnect();
});
test('public signup action creates its owner and bundle keys before issuing the real session',async()=>{
 const id=prefix+'-public';
 await prisma.partnerType.create({data:{id,idPrefix:prefix,status:'Active',defaultModules:['accounting','accounting-gst','billing']}});
 const sessions=[];let cookie;
 const action=load('src/app/signup/actions.ts',{
  'next/headers':{cookies:()=>({set:(_name,value)=>cookie=value})},
  'next/navigation':{redirect:path=>{throw Error('REDIRECT '+path);}},
  '@/lib/signupProvisioning':signup,'@/lib/designer/partnerTypesData':typeData,
  '@/lib/referrals':{resolveReferrer:async()=>undefined},'@/lib/email':{sendPartnerWelcomeEmail:async()=>{}},
  '@/lib/platformSettings':{notifyAdmins:async()=>{}},'@/lib/telegramTemplates':{newPartnerApplicationMessage:async()=>''},
  '@/lib/partnerSession':{createPartnerSessionToken:async partnerId=>{
   sessions.push(partnerId);
   if(partnerId!=='signup-preflight'){
    assert.equal(await prisma.moduleAccessKey.count({where:{partnerId,status:'active'}}),3);
    assert.equal(await prisma.businessRecord.count({where:{partnerId,moduleSlug:'users',recordKey:'Owner'}}),1);
   }
   return 'synthetic-'+partnerId;
  }},
 },{process:{env:{NODE_ENV:'test'}}});
 const form=new FormData();
 for(const key of ['businessName','addressLine','city','state','pincode','businessContact'])form.set(key,'Synthetic');
 form.set('partnerTypeId',id);form.set('businessEmail','test@example.invalid');form.set('loginContact',id);
 await assert.rejects(action.registerBusiness(form),/REDIRECT \/change-password\?welcome=1/);
 assert.equal(sessions.length,2);assert.equal(sessions[0],'signup-preflight');
 assert.equal(cookie,'synthetic-'+sessions[1]);
 assert.deepEqual(Array.from(await visibility.getVisibleModuleSlugs(sessions[1])).sort(),['accounting','accounting-gst','billing']);
});
