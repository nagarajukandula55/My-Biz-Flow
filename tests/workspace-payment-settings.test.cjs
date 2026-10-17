const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');
const helper = load('src/lib/workspacePaymentSettings.ts');
test('business UPI instructions validate syntax and stay separate from Service Centre',()=>{
  for(const module of ['rentals','hotel','billing','clinic','education','salon-spa','logistics-fleet','wholesale-b2b']) assert.equal(helper.canConfigureBusinessPayments([module]),true);
  assert.equal(helper.canConfigureBusinessPayments(['hrms']),false);
  assert.equal(helper.canConfigureBusinessPayments(['hotel','service-centre']),false);
  assert.equal(helper.readBusinessUpiId(' shop.name@bank '),'shop.name@bank');
  assert.equal(helper.readBusinessUpiId(' '),null);
  for(const invalid of ['https://pay.test','upi://pay?pa=x@y','no spaces@bank','<script>@bank','a@b',123]) assert.throws(()=>helper.readBusinessUpiId(invalid));
});
test('owner payment settings preserve hidden/absent fields and reject unauthorized writes',async()=>{
  let modules=['rentals'], authorized=true, written;
  const api=load('src/lib/workspaceSettingsActions.ts',{
    '@/lib/workspacePaymentSettings':helper,
    'next/cache':{revalidatePath:()=>{}},'next/navigation':{redirect:()=>{}},
    '@/lib/requirePartnerSession':{requireSessionPartnerId:async()=>{if(!authorized)throw Error('denied');}},
    '@/lib/tenant':{assertPartnerCanWrite:async()=>{}},
    '@/lib/designer/entitlements':{getVisibleModuleSlugs:async()=>modules},
    '@/lib/prisma':{prisma:{partner:{update:async input=>{assert.equal(input.where.id,'p1');written=input.data;}}}},
  });
  const form=new FormData();form.set('upiId','shop@bank');form.set('invoiceTerms','forged');
  await api.saveWorkspaceConfig('p1',form);assert.equal(written.upiId,'shop@bank');assert.equal(written.invoiceTerms,undefined);assert.equal(written.serviceTerms,undefined);
  const absent=new FormData();absent.set('serviceTerms','Terms');await api.saveWorkspaceConfig('p1',absent);assert.equal(written.upiId,undefined);
  form.set('upiId','bad');await assert.rejects(api.saveWorkspaceConfig('p1',form),/UPI ID/);
  authorized=false;await assert.rejects(api.saveWorkspaceConfig('p1',form),/denied/);authorized=true;
  modules=['service-centre','rentals'];await assert.rejects(api.saveWorkspaceConfig('p1',form),/existing Service Centre/);
});
