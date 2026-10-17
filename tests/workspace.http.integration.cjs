// Run against the isolated production build; never load deployment environment files.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const load = require('./loadModule.cjs');
if (process.env.MBF_ISOLATED_TEST !== '1' || process.env.DATABASE_URL !== 'postgresql://ci:ci@127.0.0.1:55439/ci') throw new Error('Disposable local database required');
const prisma = new PrismaClient();
const prefix = 'workspace-http-' + crypto.randomUUID();
const base = 'http://127.0.0.1:3317';
const secret = 'isolated-build-session-secret-at-least-32-characters';
const ids = [];
async function main() {
  const { SignJWT } = await import('jose');
  const modules = load('src/lib/designer/modules.ts').MODULES;
  for (const module of modules.filter(m => m.slug !== 'service-centre')) {
    const id = `${prefix}-${module.slug}`;
    ids.push(id);
    await prisma.partnerType.create({ data: { id, defaultModules: [module.slug] } });
    await prisma.partner.create({ data: { id, internalKey: id, partnerTypeId: id, businessName: `Test ${module.slug}`, city: 'Test', state: 'Test', pincode: '000000', businessEmail: 'test@example.invalid', businessContact: id, loginContact: id, passwordHash: 'not-a-login-password', mustChangePassword: false, subscriptionStatus: 'Active' } });
    await prisma.moduleAccessKey.create({ data: { partnerId: id, moduleSlug: module.slug, key: id } });
    const token = await new SignJWT({ partnerId: id }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('10m').sign(new TextEncoder().encode(secret));
    if(module.slug==='accounting') {
      const restricted=await fetch(`${base}/partner/${id}/accounting/reports/balance-sheet`,{headers:{cookie:`mbf_partner_session=${token}`}});
      assert.ok((await restricted.text()).includes('Upgrade to unlock'),'Starter report access remains restricted');
      const planIds=[`${id}-starter`,`${id}-pro`,`${id}-ultimate`];
      await prisma.plan.createMany({data:planIds.map((planId,index)=>({id:planId,name:`Synthetic tier ${index}`,price:100*(index+1),billingCycle:'monthly',includedModuleSlugs:['accounting'],maxUsers:5,maxLocations:1,isPublic:false}))});
      await prisma.partnerType.update({where:{id},data:{planIds}});
      await prisma.partner.update({where:{id},data:{planId:planIds[1]}});
      const cash=await prisma.chartOfAccount.create({data:{partnerId:id,accountCode:'100',accountName:'Isolated cash',accountType:'Asset'}});
      const income=await prisma.chartOfAccount.create({data:{partnerId:id,accountCode:'400',accountName:'Isolated income',accountType:'Income'}});
      const entry=await prisma.journalEntry.create({data:{partnerId:id,entryNumber:'HTTP-1',entryDate:new Date('2020-01-10'),lines:{create:[{accountId:cash.id,debit:10000,credit:0},{accountId:income.id,debit:0,credit:10000}]}}});
      for(const route of [`accounting/journal-entries/${entry.id}`,'accounting/reports/trial-balance','accounting/reports/profit-loss','accounting/reports/balance-sheet?asOf=2020-12-31']) {
        const response=await fetch(`${base}/partner/${id}/${route}`,{headers:{cookie:`mbf_partner_session=${token}`},redirect:'manual'});
        const html=await response.text();assert.equal(response.status,200,route);assert.ok(!html.includes('"digest":'),route);
        if(route.includes('balance-sheet')) {
          assert.ok(html.includes('Unclosed profit / (loss)')&&!html.includes('Balance check FAILED'),'report includes profit in equity');
        }
      }
      console.log('accounting: journal and three reconciled reports rendered');
      const reconciliationUrl=`${base}/partner/${id}/accounting/reconciliation`;
      const headers={cookie:`mbf_partner_session=${token}`};
      const gated=await fetch(reconciliationUrl,{headers});
      assert.ok((await gated.text()).includes('Enable Billing alongside Accounting'),'reconciliation requires Billing');
      await prisma.moduleAccessKey.create({data:{partnerId:id,moduleSlug:'billing',key:id+'-billing'}});
      await prisma.businessRecord.create({data:{partnerId:id,moduleSlug:'billing',recordKey:'HTTP-INVOICE',data:{issueDate:'2020-01-10',subtotal:100,taxAmount:0,totalAmount:100,paymentStatus:'Sent'}}});
      const reconcileResponse=await fetch(reconciliationUrl,{headers});
      const reconcileHtml=await reconcileResponse.text();assert.equal(reconcileResponse.status,200);assert.ok(reconcileHtml.includes('HTTP-INVOICE')&&reconcileHtml.includes('No linked journal')&&reconcileHtml.includes('Check and link journal'),'invoice reconciliation renders');
    }
    if(module.slug==='rentals') {
      const asset=await prisma.rentalAsset.create({data:{partnerId:id,assetName:'Isolated rental asset'}});
      const booking=await prisma.rentalAgreement.create({data:{partnerId:id,assetId:asset.id,assetName:asset.assetName,renter:'Synthetic renter',bookingStart:new Date(),bookingEnd:new Date(Date.now()+3600000),rentalAmount:10000}});
      for(const route of [`rentals/assets/${asset.id}`,`rentals/${booking.id}`]) {
        const response=await fetch(`${base}/partner/${id}/${route}`,{headers:{cookie:`mbf_partner_session=${token}`},redirect:'manual'});
        const html=await response.text();assert.equal(response.status,200,route);assert.ok(!html.includes('"digest":'),route);
        assert.ok(html.includes(route.includes('/assets/')?'Schedule maintenance':'Record item pickup'),'new operational control renders');
        if(!route.includes('/assets/')) assert.ok(html.includes('Receipts and refunds') && html.includes('Deposit refund still due') && html.includes('Record completed payment'),'rental payment controls render');
      }
      console.log('rentals: maintenance schedule and pickup forms rendered');
    }
    if(module.slug==='hrms') {
      const employee=await prisma.employee.create({data:{partnerId:id,name:'Isolated policy employee'}});
      const attendance=await prisma.attendanceCheckIn.create({data:{employeeId:employee.id,checkInLat:12,checkInLng:77,checkInAt:new Date('2020-01-10T03:30:00Z'),checkOutAt:new Date('2020-01-10T11:30:00Z')}});
      for(const route of [`hrms/${employee.id}`,`hrms/attendance/history?correct=${attendance.id}`,'hrms/attendance/history?from=invalid','hrms/payroll/new?basis=attendance']) {
        const response=await fetch(`${base}/partner/${id}/${route}`,{headers:{cookie:`mbf_partner_session=${token}`},redirect:'manual'});
        const html=await response.text();assert.equal(response.status,200,route);assert.ok(!html.includes('"digest":'),route);
        if(route.includes('correct='))assert.ok(html.includes('Save audited correction')&&html.includes('Recent corrections'),'correction form renders');
        if(route===`hrms/${employee.id}`)assert.ok(html.includes('Attendance policy')&&html.includes('Assigned offices'),'policy form renders');
      }
      console.log('hrms: employee policy, correction form and invalid-filter handling rendered');
    }
    if(module.slug==='hotel') {
      await prisma.businessRecord.createMany({data:[
        {partnerId:id,moduleSlug:'hotel-rooms',recordKey:'room-test',data:{name:'101',nameKey:'101',roomType:'Standard',capacity:2,ratePaise:100000,status:'Ready'}},
        {partnerId:id,moduleSlug:'hotel-stays',recordKey:'stay-test',data:{roomId:'room-test',roomName:'101',guest:'Isolated hotel guest',contact:'',guests:1,arrival:'2030-01-01',departure:'2030-01-02',ratePaise:100000,roomChargePaise:100000,status:'Confirmed',entries:[]}},
      ]});
      for(const route of ['hotel','hotel/new','hotel/rooms','hotel/rooms?room=room-test','hotel/stay-test']) {
        const response=await fetch(`${base}/partner/${id}/${route}`,{headers:{cookie:`mbf_partner_session=${token}`},redirect:'manual'});
        const html=await response.text();assert.equal(response.status,200,route);assert.ok(!html.includes('"digest":'),route);
        if(route==='hotel')assert.ok(html.includes(`/partner/${id}/hotel/stay-test`),'reservation has real detail link');
        if(route==='hotel/rooms')assert.ok(html.includes(`/partner/${id}/hotel/rooms?room=room-test`),'room has real edit link');
        if(route==='hotel/stay-test')assert.ok(html.includes('Isolated hotel guest')&&html.includes('Record entry'),'folio content');
      }
      console.log('hotel: reservation list, create, rooms, edit and guest folio rendered');
    }
    for (const route of ['dashboard', 'analytics', 'settings', 'settings/notifications']) {
      const response = await fetch(`${base}/partner/${id}/${route}`, { headers: { cookie: `mbf_partner_session=${token}` }, redirect: 'manual' });
      const html = await response.text();
      assert.equal(response.status, 200, `${module.slug}/${route}: ${response.status}`);
      assert.ok(!html.includes('NEXT_REDIRECT') && !html.includes('NEXT_NOT_FOUND') && !html.includes('"digest":'), `${module.slug}/${route}: render error`);
      assert.ok(html.includes(`/partner/${id}/settings/notifications`), `${module.slug}/${route}: missing correct notification link`);
      assert.ok(!html.includes(`/partner/${id}/service-centre/telegram`), `${module.slug}/${route}: unrelated notification link`);
      if (route === 'dashboard') assert.ok(html.includes('Your business overview'), `${module.slug}: workspace branch missing`);
      if (route === 'settings') assert.ok(html.includes('Your module settings'), `${module.slug}: settings branch missing`);
    }
    const denied = await fetch(`${base}/partner/${id}-other/settings/notifications`, { headers: { cookie: `mbf_partner_session=${token}` }, redirect: 'manual' });
    const body = await denied.text();
    assert.ok(denied.status === 307 || body.includes('NEXT_REDIRECT'), 'cross-tenant request was not redirected');
    console.log(`${module.slug}: 4 pages rendered; cross-tenant access denied`);
  }
}
main().finally(async () => {
  await prisma.journalLine.deleteMany({where:{journalEntry:{partnerId:{in:ids}}}});
  await prisma.journalEntry.deleteMany({where:{partnerId:{in:ids}}});
  await prisma.chartOfAccount.deleteMany({where:{partnerId:{in:ids}}});
  await prisma.rentalAgreement.deleteMany({where:{partnerId:{in:ids}}});
  await prisma.rentalAsset.deleteMany({where:{partnerId:{in:ids}}});
  await prisma.attendanceCheckIn.deleteMany({where:{employee:{partnerId:{in:ids}}}});
  await prisma.employee.deleteMany({where:{partnerId:{in:ids}}});
  await prisma.businessRecord.deleteMany({where:{partnerId:{in:ids}}});
  await prisma.moduleAccessKey.deleteMany({ where: { partnerId: { in: ids } } });
  await prisma.partner.deleteMany({ where: { id: { in: ids } } });
  await prisma.partnerType.deleteMany({ where: { id: { in: ids } } });
  await prisma.plan.deleteMany({where:{id:{startsWith:prefix}}});
  await prisma.$disconnect();
}).catch(error => { console.error(error); process.exitCode = 1; });
