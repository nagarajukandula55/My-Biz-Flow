const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const load = require('./loadModule.cjs');
if (process.env.MBF_ISOLATED_TEST !== '1' || !['postgresql://ci:ci@127.0.0.1:55439/ci','postgresql://ci:ci@localhost:5432/ci','postgres://ci:ci@localhost:5432/ci'].includes(process.env.DATABASE_URL)) throw new Error('Disposable local CI database required');
const { PrismaClient } = require('@prisma/client');
const base = new PrismaClient();
const db = load('src/lib/databaseTransaction.ts', { 'node:async_hooks': require('node:async_hooks'), '@/lib/databaseClientContext': load('src/lib/databaseClientContext.ts') });
const prisma = db.transactionAwareClient(base);
const lock = load('src/lib/withRecordLock.ts', { '@/lib/prisma': { prisma }, '@/lib/databaseTransaction': db });
const partnerId = 'readiness-' + crypto.randomUUID();
const prefix = 'RT' + crypto.randomBytes(5).toString('hex');
const tenant = { assertPartnerCanWrite: async () => {}, assertModuleAccess: async () => {}, PartnerScopeError: Error };
const common = { '@/lib/prisma': { prisma }, '@/lib/withRecordLock': lock, '@/lib/tenant': tenant, '@/lib/bookingValidation': load('src/lib/bookingValidation.ts') };
const accounting=load('src/lib/accounting.ts',common);
const clinic = load('src/lib/clinic.ts', { ...common, '@/lib/businessRecords': { createBusinessRecord: async (partnerId, moduleSlug, data) => {
 const recordKey = crypto.randomUUID(); await prisma.businessRecord.create({data:{partnerId,moduleSlug,recordKey,data}}); return {id:recordKey};
} } });
const rentals = load('src/lib/rentals.ts', { ...common, '@/lib/rentalFulfillment': load('src/lib/rentalFulfillment.ts'), '@/lib/rentalAssetPolicy': load('src/lib/rentalAssetPolicy.ts'), '@/lib/rentalTerms': load('src/lib/rentalTerms.ts'), '@/lib/rentalRules': load('src/lib/rentalRules.ts', { '@/lib/format': load('src/lib/format.ts') }) });
let ownerAllowed=true;
const rentalPayments=load('src/lib/rentalPayments.ts',{...common,'@/lib/rentalSettlement':load('src/lib/rentalSettlement.ts'),'@/lib/requirePartnerSession':{requireSessionPartnerId:async()=>{if(!ownerAllowed)throw Error('Owner required');}}});

test('rental receipts serialize competing payments, retain history and isolate refunds',async()=>{
 const input={assetName:'Receipt test unit',renter:'Synthetic renter',bookingStart:start,bookingEnd:end,rentalAmount:10000,depositAmount:50000,status:'Confirmed'};
 const booking=await rentals.createAgreement(partnerId,input);
 const pay=(paymentKind,paymentAmount,paymentReference)=>({paymentKind,paymentAmount,paymentReference});
 const receipt=pay('Deposit receipt','300','receipt-1');
 await Promise.all([rentalPayments.recordRentalPayment(partnerId,booking.id,receipt),rentalPayments.recordRentalPayment(partnerId,booking.id,receipt)]);
 assert.equal((await rentalPayments.getRentalPayments(partnerId,booking.id)).length,1);
 await assert.rejects(rentalPayments.recordRentalPayment(partnerId,booking.id,{...receipt,paymentAmount:'301'}),/reference/);
 await assert.rejects(rentalPayments.recordRentalPayment(partnerId+'-other',booking.id,receipt),/not found/);
 assert.equal((await rentalPayments.getRentalPayments(partnerId+'-other',booking.id)).length,0);
 await assert.rejects(rentals.deleteAgreement(partnerId,booking.id),/history/);
 await assert.rejects(rentals.updateAgreement(partnerId,booking.id,{...input,rentalAmount:12000}),/prices/);
 await assert.rejects(rentalPayments.recordRentalPayment(partnerId,booking.id,pay('Deposit refund','1','early')),/balance/);
 await rentals.returnAsset(partnerId,booking.id,10000);
 const refunds=await Promise.allSettled([rentalPayments.recordRentalPayment(partnerId,booking.id,pay('Deposit refund','200','refund-1')),rentalPayments.recordRentalPayment(partnerId,booking.id,pay('Deposit refund','200','refund-2'))]);
 assert.equal(refunds.filter(result=>result.status==='fulfilled').length,1);
 assert.equal((await rentalPayments.getRentalPayments(partnerId,booking.id)).length,2);
 ownerAllowed=false;
 try{await assert.rejects(rentalPayments.recordRentalPayment(partnerId,booking.id,receipt),/Owner/);}finally{ownerAllowed=true;}
 const cancelled=await rentals.createAgreement(partnerId,{...input,assetName:'Cancellation receipt unit'});
 await rentalPayments.recordRentalPayment(partnerId,cancelled.id,pay('Rental receipt','100','rent-1'));
 await rentals.updateAgreement(partnerId,cancelled.id,{...input,assetName:'Cancellation receipt unit',status:'Cancelled'});
 await rentalPayments.recordRentalPayment(partnerId,cancelled.id,pay('Rental refund','100','rent-refund'));
 await assert.rejects(rentals.updateAgreement(partnerId,cancelled.id,{...input,assetName:'Cancellation receipt unit'}),/reopened/);
});
const hrms = load('src/lib/hrms.ts', {...common, 'node:crypto':crypto, '@/lib/requirePartnerSession':{requireSessionPartnerId:async()=>{if(!ownerAllowed)throw Error('Owner required');}}, '@/lib/databaseTransaction':db, '@/lib/format':load('src/lib/format.ts'), '@/lib/telegram':{sendPartnerTelegramAlert:async()=>{}}, '@/lib/partnerData':{getPartner:async()=>null}, '@/lib/telegramTemplates':{}, '@/lib/email/moduleEmails':{}});
let delivered = 0;
const events = load('src/lib/eventBooking.ts', { ...common, '@/lib/databaseTransaction': db,
 '@/lib/telegram': { sendPartnerTelegramAlert: async () => { assert.equal(db.inDatabaseTransaction(), false); delivered++; } },
 '@/lib/partnerData': { getPartner: async () => ({ businessName: 'Test' }) },
 '@/lib/telegramTemplates': { eventBookingConfirmedMessage: async () => 'Confirmed', eventPaymentReceivedMessage: async () => 'Payment' },
 '@/lib/eventBookingTypes': load('src/lib/eventBookingTypes.ts'),
});
const loyalty = load('src/lib/loyaltyRewards.ts', { ...common, '@/lib/loyaltyRules': load('src/lib/loyaltyRules.ts') });
const start = new Date('2030-01-10T10:00:00Z'), end = new Date('2030-01-10T11:00:00Z');

test('Accounting isolates accounts, rejects unsafe journal amounts and reconciles reports under fiscal-close locks',async()=>{
 const cash=await accounting.createChartOfAccount(partnerId,{accountCode:'100',accountName:'Cash',accountType:'Asset'});
 const sales=await accounting.createChartOfAccount(partnerId,{accountCode:'400',accountName:'Sales',accountType:'Income'});
 const foreign=await accounting.createChartOfAccount(partnerId+'-other',{accountCode:'100',accountName:'Private foreign account',accountType:'Asset'});
 await assert.rejects(accounting.createChartOfAccount(partnerId,{accountCode:'101',accountName:'Invalid parent',accountType:'Asset',parentAccountId:foreign.id}),/belong/);
 const child=await accounting.createChartOfAccount(partnerId,{accountCode:'102',accountName:'Petty cash',accountType:'Asset',parentAccountId:cash.id});
 await assert.rejects(accounting.updateChartOfAccount(partnerId,cash.id,{accountCode:'100',accountName:'Cash',accountType:'Asset',parentAccountId:child.id}),/cycle/);
 const lines=[{accountId:cash.id,debit:10000,credit:0},{accountId:sales.id,debit:0,credit:10000}];
 const input={entryNumber:'JE-test',entryDate:new Date('2020-01-10T00:00:00Z'),lines};
 assert.match((await accounting.createJournalEntry(partnerId,{...input,lines:[lines[0],{...lines[1],accountId:foreign.id}]})).error,/belong/);
 assert.match((await accounting.createJournalEntry(partnerId,{...input,lines:[{...lines[0],credit:-100},lines[1]]})).error,/non-negative/);
 const created=await accounting.createJournalEntry(partnerId,input);assert.ok(created.entry);
 await assert.rejects(accounting.updateChartOfAccount(partnerId,sales.id,{accountCode:'400',accountName:'Sales',accountType:'Liability'}),/cannot change type/);
 const trial=await accounting.getTrialBalance(partnerId);assert.equal(trial.reduce((s,r)=>s+r.totalDebit-r.totalCredit,0),0);
 assert.equal((await accounting.getProfitAndLoss(partnerId)).netProfit,10000);
 const sheet=await accounting.getBalanceSheet(partnerId,new Date('2020-12-31T00:00:00Z'));
 assert.equal(sheet.totalAssets,sheet.totalLiabilities+sheet.totalEquity);assert.equal(sheet.totalEquity,10000);
 assert.equal((await accounting.getTrialBalance(partnerId+'-other'))[0].totalDebit,0);
 const period=await accounting.createFiscalPeriod(partnerId,{name:'January',startDate:new Date('2020-01-01'),endDate:new Date('2020-01-31')});
 await accounting.closeFiscalPeriod(partnerId,period.id);
 assert.match((await accounting.updateJournalEntry(partnerId,created.entry.id,{...input,entryDate:new Date('2020-02-10')})).error,/closed/);
 assert.match((await accounting.createJournalEntry(partnerId,{...input,entryNumber:'blocked'})).error,/closed/);
 await accounting.reopenFiscalPeriod(partnerId,period.id);
 const changed=await accounting.updateJournalEntry(partnerId,created.entry.id,{...input,lines:lines.map(l=>({...l,debit:l.debit*2,credit:l.credit*2}))});assert.equal(changed.entry.totalDebit,20000);
 await assert.rejects(lock.withRecordLock('accounting-ledger',partnerId,async()=>{await accounting.updateJournalEntry(partnerId,created.entry.id,input);throw Error('rollback journal');}),/rollback journal/);
 assert.equal((await accounting.getJournalEntry(partnerId,created.entry.id)).totalDebit,20000);
 let releaseClose,signalHeld;const closeGate=new Promise(resolve=>releaseClose=resolve),held=new Promise(resolve=>signalHeld=resolve);
 const closing=lock.withRecordLock('accounting-ledger',partnerId,async()=>{signalHeld();await closeGate;await accounting.closeFiscalPeriod(partnerId,period.id);});
 await held;const posting=accounting.createJournalEntry(partnerId,{...input,entryNumber:'closed-after-lock'});releaseClose();await closing;
 assert.match((await posting).error,/closed/);
 assert.match((await accounting.createJournalEntry(partnerId,{...input,entryNumber:'closed-last-day',entryDate:new Date('2020-01-31T16:00:00Z')})).error,/closed/);
});

test('simultaneous Clinic appointments cannot double-book; invalid patients and reopening conflicts fail', async () => {
 const patient = await prisma.patient.create({data:{partnerId,name:'Test patient'}});
 const input = {patientId:patient.id,doctor:'Doctor',appointmentDateTime:start,durationMinutes:60,consultationFee:10000};
 const results = await Promise.all([clinic.createAppointment(partnerId,input),clinic.createAppointment(partnerId,input)]);
 assert.equal(results.filter(r=>r.ok).length,1);
 const id = results.find(r=>r.ok).id;
 await clinic.setAppointmentStatus(partnerId,id,'Cancelled');
 assert.equal((await clinic.createAppointment(partnerId,input)).ok,true);
 await assert.rejects(clinic.setAppointmentStatus(partnerId,id,'Scheduled'),/already/);
 await assert.rejects(clinic.createAppointment(partnerId+'-other',input),/Patient/);
 await assert.rejects(clinic.createAppointment(partnerId,{...input,durationMinutes:-1}),/duration/);
 const adjacent = await clinic.createAppointment(partnerId,{...input,appointmentDateTime:end});
 assert.equal(adjacent.ok,true);
 await clinic.completeAppointment(partnerId,adjacent.id,'Test notes');
 await Promise.all([clinic.createInvoiceFromAppointment(partnerId,adjacent.id),clinic.createInvoiceFromAppointment(partnerId,adjacent.id)]);
 assert.equal(await prisma.businessRecord.count({where:{partnerId,moduleSlug:'billing'}}),1);
});

test('Rentals protects concurrent bookings, unlinked asset names, rescheduling and tenant boundaries', async () => {
 const asset = await prisma.rentalAsset.create({data:{partnerId,assetName:'Camera'}});
 const input = {assetId:asset.id,assetName:'Camera',renter:'Test renter',bookingStart:start,bookingEnd:end,rentalAmount:100};
 const results = await Promise.all([rentals.createAgreement(partnerId,input),rentals.createAgreement(partnerId,input)]);
 assert.equal(results.filter(r=>r.ok).length,1);
 assert.equal((await rentals.createAgreement(partnerId,{...input,assetId:undefined,assetName:' camera '})).ok,false);
 await assert.rejects(rentals.createAgreement(partnerId+'-other',input),/Asset/);
 await assert.rejects(rentals.createAgreement(partnerId,{...input,bookingEnd:start}),/end/);
 const id=results.find(r=>r.ok).id;
 await rentals.updateAgreement(partnerId,id,{...input,status:'Cancelled'});
 assert.equal((await rentals.createAgreement(partnerId,input)).ok,true);
 assert.equal((await rentals.updateAgreement(partnerId,id,{...input,status:'Confirmed'})).ok,false);
});

test('Rental batches roll back every item on conflict and support independent partial returns', async () => {
 const a=await rentals.createAsset(partnerId,{assetName:'Batch camera'});
 const b=await rentals.createAsset(partnerId,{assetName:'Batch tripod'});
 const input=asset=>({assetId:asset.id,assetName:asset.assetName,renter:'Batch customer',bookingStart:start,bookingEnd:end,rentalAmount:1000,depositAmount:5000});
 const first=input(a),second=input(b);
 await assert.rejects(rentals.createAgreementBatch(partnerId,[first,first]),/distinct/);
 const occupied=await rentals.createAgreement(partnerId,second);
 await assert.rejects(rentals.createAgreementBatch(partnerId,[first,second]),/unavailable/);
 assert.equal(await base.rentalAgreement.count({where:{partnerId,assetId:a.id}}),0);
 await rentals.deleteAgreement(partnerId,occupied.id);
 await assert.rejects(rentals.createAgreementBatch(partnerId,[first,{...second,assetId:'foreign'}]),/Asset not found/);
 assert.equal(await base.rentalAgreement.count({where:{partnerId,assetId:a.id}}),0);
 const competing=await Promise.allSettled([rentals.createAgreementBatch(partnerId,[first,second]),rentals.createAgreementBatch(partnerId,[second,first])]);
 assert.equal(competing.filter(r=>r.status==='fulfilled').length,1);
 const batch=competing.find(r=>r.status==='fulfilled').value;
 assert.equal((await rentals.getAgreementBatch(partnerId,batch.id)).length,2);
 assert.equal((await rentals.getAgreementBatch(partnerId+'-foreign',batch.id)).length,0);
 await assert.rejects(rentals.deleteAgreement(partnerId,batch.ids[1]),/retained/);
 await rentals.returnAsset(partnerId,batch.ids[0],1000,'One item returned');
 await rentals.returnAsset(partnerId,batch.ids[0],4000,'Duplicate return');
 const lines=await rentals.getAgreementBatch(partnerId,batch.id);
 assert.equal(lines.filter(line=>line.returned).length,1);
 assert.equal(lines.find(line=>line.returned).refundableAmount,4000);
 await rentals.returnAsset(partnerId,batch.ids[1],0);
 assert.equal((await rentals.getAgreementBatch(partnerId,batch.id)).filter(line=>line.returned).length,2);
});

test('Rentals schedules multiple maintenance windows and preserves independent pickup evidence',async()=>{
 const asset=await rentals.createAsset(partnerId,{assetName:'Scheduled maintenance unit'});
 const period={maintenanceStart:'2032-01-10T09:00',maintenanceEnd:'2032-01-10T17:00',maintenanceNotes:'Inspection'};
 await rentals.scheduleMaintenance(partnerId,asset.id,period);
 await rentals.scheduleMaintenance(partnerId,asset.id,{...period,maintenanceStart:'2032-02-10T09:00',maintenanceEnd:'2032-02-10T17:00'});
 assert.equal((await rentals.getAsset(partnerId,asset.id)).maintenanceWindows.length,2);
 await assert.rejects(rentals.scheduleMaintenance(partnerId,asset.id,period),/overlaps/);
 await assert.rejects(rentals.scheduleMaintenance(partnerId+'-foreign',asset.id,period),/not found/);
 const input={assetId:asset.id,assetName:asset.assetName,renter:'Pickup customer',bookingStart:new Date('2032-02-10T04:00:00Z'),bookingEnd:new Date('2032-02-10T05:00:00Z'),rentalAmount:1000,depositAmount:500};
 await assert.rejects(rentals.createAgreement(partnerId,input),/maintenance/);
 await rentals.removeMaintenance(partnerId,asset.id,'2032-02-10T03:30:00.000Z');
 const future=await rentals.createAgreement(partnerId,input);assert.ok(future.ok);
 await assert.rejects(rentals.scheduleMaintenance(partnerId,asset.id,{...period,maintenanceStart:'2032-02-10T09:00',maintenanceEnd:'2032-02-10T17:00'}),/booking/);
 const evidence={receivedBy:'Synthetic recipient',condition:'No visible damage',reference:'HANDOVER-1'};
 await assert.rejects(rentals.recordRentalPickup(partnerId,future.id,evidence),/booked period/);
 const other=await rentals.createAsset(partnerId,{assetName:'Partial pickup unit'});
 const active={...input,bookingStart:new Date(Date.now()-3600000),bookingEnd:new Date(Date.now()+3600000)};
 const batch=await rentals.createAgreementBatch(partnerId,[active,{...active,assetId:other.id,assetName:other.assetName}]);
 await Promise.all([rentals.recordRentalPickup(partnerId,batch.id,evidence),rentals.recordRentalPickup(partnerId,batch.id,evidence)]);
 assert.equal((await rentals.getAgreementBatch(partnerId,batch.id)).filter(item=>item.status==='Ongoing').length,1);
 assert.equal((await rentals.getAgreement(partnerId,batch.id)).handover.receivedBy,evidence.receivedBy);
 await assert.rejects(rentals.recordRentalPickup(partnerId,batch.id,{...evidence,condition:'Rewritten'}),/overwritten/);
 await assert.rejects(rentals.updateAgreement(partnerId,batch.id,{...active,status:'Cancelled'}),/Collected/);
 await assert.rejects(rentals.updateAgreement(partnerId,batch.id,{...active,assetId:other.id}),/Collected/);
 await prisma.rentalAgreement.update({where:{id:batch.id},data:{bookingEnd:new Date(Date.now()-1000)}});
 assert.equal((await rentals.createAgreement(partnerId,{...active,bookingStart:new Date(Date.now()+86400000),bookingEnd:new Date(Date.now()+90000000)})).ok,false);
 await rentals.returnAsset(partnerId,batch.id,100,'Returned inspected');
 assert.equal((await rentals.getAgreement(partnerId,batch.id)).handover.condition,evidence.condition);
});

test('Events serialize venue/resource reservations and recheck conflicts on reopening', async () => {
 const venue = await prisma.venue.create({data:{partnerId,name:'Hall'}});
 const resource = await prisma.eventResource.create({data:{partnerId,name:'Projector'}});
 const input = {venueId:venue.id,eventName:'Test event',bookingType:'OneTime',startAt:start,endAt:end,customerName:'Test',totalAmount:10000,allocations:[{resourceId:resource.id,quantity:1}]};
 const results = await Promise.all([events.createEventBooking(partnerId,input),events.createEventBooking(partnerId,{...input,allocations:[]})]);
 assert.equal(results.filter(r=>r.ok).length,1);
 const id = results.find(r=>r.ok).id;
 await events.setEventBookingStatus(partnerId,id,'Cancelled');
 const replacement = await events.createEventBooking(partnerId,input);
 assert.equal(replacement.ok,true);
 await assert.rejects(events.setEventBookingStatus(partnerId,id,'Confirmed'),/already/);
 assert.equal((await events.createEventBooking(partnerId,{...input,venueId:null})).ok,false);
 await assert.rejects(events.createEventBooking(partnerId+'-other',input),/Venue/);
 await assert.rejects(events.createEventBooking(partnerId+'-other',{...input,venueId:null}),/Resource/);
 await assert.rejects(events.createEventBooking(partnerId,{...input,endAt:start}),/end/);
 const prior=delivered;
 await Promise.all([events.recordEventBookingPayment(partnerId,replacement.id,10),events.recordEventBookingPayment(partnerId,replacement.id,20)]);
 assert.equal((await prisma.eventBooking.findUnique({where:{id:replacement.id}})).amountPaid,3000);
 assert.equal(delivered-prior,2);
 await assert.rejects(lock.withRecordLock('event-bookings',partnerId,async()=>{ await events.recordEventBookingPayment(partnerId,replacement.id,5); throw new Error('force rollback'); }),/rollback/);
 assert.equal(delivered-prior,2);
 assert.equal((await prisma.eventBooking.findUnique({where:{id:replacement.id}})).amountPaid,3000);
});

test('Loyalty parallel earnings retain every credit; parallel redemptions cannot spend the same balance', async () => {
 const member=await prisma.loyaltyMember.create({data:{partnerId,customerName:'Test'}});
 await Promise.all(Array.from({length:5},()=>loyalty.earnPoints(partnerId,member.id,1000)));
 let row=await prisma.loyaltyMember.findUnique({where:{id:member.id}});
 assert.equal(row.pointsBalance,250); assert.equal(row.lifetimePointsEarned,250);
 const redeemed=await Promise.all([loyalty.redeemPoints(partnerId,member.id,200),loyalty.redeemPoints(partnerId,member.id,200)]);
 assert.equal(redeemed.filter(r=>!r.error).length,1);
 assert.equal((await prisma.loyaltyMember.findUnique({where:{id:member.id}})).pointsBalance,50);
 assert.equal(await prisma.pointsLedgerEntry.count({where:{memberId:member.id}}),6);
 assert.ok((await loyalty.earnPoints(partnerId,member.id,Infinity)).error);
 assert.ok((await loyalty.redeemPoints(partnerId,member.id,0.5)).error);
 assert.ok((await loyalty.redeemPoints(partnerId+'-other',member.id,1)).error);
 await assert.rejects(lock.withRecordLock('loyalty-member',`${partnerId}:${member.id}`,async()=>{await loyalty.earnPoints(partnerId,member.id,1000);throw new Error('rollback');}),/rollback/);
 assert.equal((await prisma.loyaltyMember.findUnique({where:{id:member.id}})).pointsBalance,50);
});

let failKeys=false;
const signupClient = new Proxy(prisma,{get(target,key){if(key==='moduleAccessKey'&&failKeys)return {createMany:async()=>{throw new Error('forced key failure');}};return Reflect.get(target,key);}});
const signup=load('src/lib/signupProvisioning.ts',{
 'crypto':crypto,'@/lib/prisma':{prisma:signupClient},'@/lib/withRecordLock':lock,
 '@/lib/passwords':load('src/lib/passwords.ts',{'crypto':crypto}),
 '@/lib/catalog/productDomains':load('src/lib/catalog/productDomains.ts'),
 '@/lib/designer/modules':load('src/lib/designer/modules.ts'),
});
test('Signup commits owner and keys together, serializes IDs and does not collide after deletions',async()=>{
 await prisma.partnerType.create({data:{id:prefix,idPrefix:prefix,defaultModules:['clinic','billing'],assignableRoleIds:['Owner']}});
 const input={partnerTypeId:prefix,businessName:'Test signup',addressLine:'Test',city:'Test',state:'Test',pincode:'000000',gstin:'',businessEmail:'test@example.invalid',businessContact:'Test',loginContact:prefix};
 const created=await Promise.all([signup.provisionSignup(input),signup.provisionSignup({...input,loginContact:prefix+'-two'})]);
 assert.equal(new Set(created.map(p=>p.id)).size,2);
 for(const p of created){assert.equal(await prisma.moduleAccessKey.count({where:{partnerId:p.id}}),2);assert.equal(await prisma.businessRecord.count({where:{partnerId:p.id,moduleSlug:'users'}}),1);}
 const first=created.map(p=>p.id).sort()[0];
 await prisma.partner.delete({where:{id:first}});
 const third=await signup.provisionSignup({...input,loginContact:prefix+'-three'});
 assert.ok(third.id.endsWith('0003'));
 await prisma.partner.delete({where:{id:third.id}});
 const fourth=await signup.provisionSignup({...input,loginContact:prefix+'-four'});
 assert.ok(fourth.id.endsWith('0004'), 'deleted latest ID must never be reused');
 const count=await prisma.partner.count({where:{partnerTypeId:prefix}});
 failKeys=true;
 await assert.rejects(signup.provisionSignup({...input,loginContact:prefix+'-fail'}),/forced key failure/);
 failKeys=false;
 assert.equal(await prisma.partner.count({where:{partnerTypeId:prefix}}),count);
 assert.equal(await prisma.businessRecord.count({where:{partnerId:prefix+'0005'}}),0);
 await prisma.partnerType.update({where:{id:prefix},data:{status:'Inactive'}});
 await assert.rejects(signup.provisionSignup({...input,loginContact:prefix+'-inactive'}),/not accepting/);
});

test('all 25 business packages covering 26 internal modules provision an owner and exactly their own keys',async()=>{
 const catalog=require('../docs/pricing-catalog-audit-2026-10-07.json').catalog;
 const {buildMarketProposal}=require('../scripts/market-pricing-proposal.cjs');
 const drafts=buildMarketProposal(catalog).changes.filter(c=>c.draftType).map(c=>c.draftType);
 const types=[...catalog.types,...drafts];
 assert.equal(types.length,25);
 assert.equal(new Set(types.flatMap(t=>t.defaultModules)).size,26);
 for(const [index,type] of types.entries()){
  const id=`${prefix}-module-${index}`;
  await prisma.partnerType.create({data:{id,idPrefix:prefix,defaultModules:type.defaultModules,assignableRoleIds:['Owner'],status:'Active'}});
  const p=await signup.provisionSignup({partnerTypeId:id,businessName:'Synthetic module signup',addressLine:'Test',city:'Test',state:'Test',pincode:'000000',businessEmail:'test@example.invalid',businessContact:'Test',loginContact:id});
  const keys=await prisma.moduleAccessKey.findMany({where:{partnerId:p.id}});
  assert.deepEqual(keys.map(k=>k.moduleSlug).sort(),[...new Set(type.defaultModules)].sort(),type.id);
  assert.ok(keys.every(k=>k.status==='active'));
  assert.equal(await prisma.businessRecord.count({where:{partnerId:p.id,moduleSlug:'users',recordKey:'Owner'}}),1);
  const account=await prisma.partner.findUnique({where:{id:p.id}});
  assert.ok(account.trialEndAt>account.trialStartAt);
 }
});

test('rental pricing and terms commit together, remain tenant scoped and survive edits',async()=>{
 const terms={category:'Vehicles and bikes',rateUnit:'Hourly',ratePaise:10000,pickupInstructions:'Collect at depot',returnInstructions:'Return at depot',cancellationTerms:'Agreed terms'};
 const input={assetName:'Test bike',renter:'Test',bookingStart:start,bookingEnd:new Date(start.getTime()+90*60000),rentalAmount:1,terms};
 const result=await rentals.createAgreement(partnerId,input);assert.equal(result.ok,true);
 let saved=await rentals.getAgreement(partnerId,result.id);assert.equal(saved.rentalAmount,20000);assert.equal(saved.terms.category,'Vehicles and bikes');
 assert.equal(await rentals.getAgreement(partnerId+'-other',result.id),null);
 await rentals.updateAgreement(partnerId,result.id,{...input,bookingEnd:new Date(start.getTime()+180*60000)});
 saved=await rentals.getAgreement(partnerId,result.id);assert.equal(saved.rentalAmount,30000);
 await assert.rejects(lock.withRecordLock('rental-bookings',partnerId,async()=>{await rentals.updateAgreement(partnerId,result.id,{...input,terms:{...terms,pickupInstructions:'Must roll back'}});throw Error('rollback terms');}),/rollback terms/);
 assert.equal((await rentals.getAgreement(partnerId,result.id)).terms.pickupInstructions,'Collect at depot');
 await rentals.deleteAgreement(partnerId,result.id);
 assert.equal(await prisma.businessRecord.count({where:{partnerId,moduleSlug:'rentals-terms',recordKey:result.id}}),0);
});

test('HRMS blocks invalid/no-fence attendance, serializes shifts, handles overnight checkout and scopes all employee filters',async()=>{
 const employee=await prisma.employee.create({data:{partnerId,name:'Attendance test'}});
 const foreign=await prisma.employee.create({data:{partnerId:partnerId+'-other',name:'Foreign employee'}});
 assert.equal((await hrms.checkIn(partnerId,employee.id,12,77)).ok,false);
 await assert.rejects(hrms.createOfficeLocation(partnerId,{name:'Invalid',lat:91,lng:77}),/valid latitude/);
 await hrms.createOfficeLocation(partnerId,{name:'Test office',lat:12,lng:77,geofenceRadiusMeters:100});
 assert.equal((await hrms.checkIn(partnerId,employee.id,NaN,77)).ok,false);
 assert.equal((await hrms.checkIn(partnerId,employee.id,13,77)).ok,false);
 assert.equal((await hrms.checkIn(partnerId,foreign.id,12,77)).ok,false);
 const results=await Promise.all([hrms.checkIn(partnerId,employee.id,12,77),hrms.checkIn(partnerId,employee.id,12,77)]);
 assert.equal(results.filter(r=>r.ok).length,1);
 const open=await hrms.getOpenCheckInToday(employee.id,partnerId);
 await prisma.attendanceCheckIn.update({where:{id:open.id},data:{checkInAt:new Date(Date.now()-86400000)}});
 assert.equal((await hrms.listOpenCheckIns(partnerId)).length,1);
 assert.equal((await hrms.checkOut(partnerId,employee.id,12,77)).ok,true);
 assert.equal(await hrms.getOpenCheckInToday(employee.id,partnerId),null);
 await prisma.attendanceCheckIn.create({data:{employeeId:foreign.id,checkInLat:12,checkInLng:77}});
 await prisma.leaveRequest.create({data:{employeeId:foreign.id,leaveType:'Annual',startDate:start,endDate:end}});
 await prisma.payslip.create({data:{employeeId:foreign.id,month:1,year:2030,basicPay:100,allowances:0,deductions:0,netPay:100}});
 assert.equal((await hrms.listAttendanceHistory(partnerId,{employeeId:foreign.id})).length,0);
 assert.equal((await hrms.listLeaveRequests(partnerId,foreign.id)).length,0);
 assert.equal((await hrms.listPayslips(partnerId,foreign.id)).length,0);
 assert.equal(await hrms.getOpenCheckInToday(foreign.id,partnerId),null);
 await prisma.employee.update({where:{id:employee.id},data:{status:'Inactive'}});
 assert.equal((await hrms.checkIn(partnerId,employee.id,12,77)).ok,false);
});

test('HRMS work policies and audited corrections enforce owner, tenant, overlap and finalized-payroll rules', async()=>{
 const employee=await prisma.employee.create({data:{partnerId,name:'Policy employee'}});
 const office=await hrms.createOfficeLocation(partnerId,{name:'Assigned branch',lat:14,lng:78,geofenceRadiusMeters:100});
 ownerAllowed=false;
 await assert.rejects(hrms.saveAttendancePolicy(partnerId,employee.id,{mode:'Remote / field'}),/Owner/);
 ownerAllowed=true;
 await assert.rejects(hrms.saveAttendancePolicy(partnerId,employee.id,{mode:'Assigned offices',officeIds:['foreign']}),/belonging/);
 await hrms.saveAttendancePolicy(partnerId,employee.id,{mode:'Assigned offices',officeIds:[office.id]});
 assert.equal((await hrms.checkIn(partnerId,employee.id,12,77)).ok,false);
 assert.equal((await hrms.checkIn(partnerId,employee.id,14,78)).ok,true);
 await hrms.checkOut(partnerId,employee.id,14,78);
 await hrms.saveAttendancePolicy(partnerId,employee.id,{mode:'Remote / field'});
 assert.equal((await hrms.checkIn(partnerId,employee.id,20,80)).ok,true);
 await hrms.checkOut(partnerId,employee.id,20,80);
 const row=await prisma.attendanceCheckIn.create({data:{employeeId:employee.id,checkInLat:14,checkInLng:78,checkInAt:new Date('2020-01-10T03:30:00Z'),checkOutAt:new Date('2020-01-10T11:30:00Z')}});
 const expected=JSON.stringify({checkInAt:row.checkInAt.toISOString(),checkOutAt:row.checkOutAt.toISOString(),status:row.status});
 const values={expected,checkInAt:'2020-01-10T09:30',checkOutAt:'2020-01-10T17:00',status:'Late',reason:'Clock corrected by owner'};
 ownerAllowed=false;await assert.rejects(hrms.correctAttendance(partnerId,row.id,values),/Owner/);ownerAllowed=true;
 await assert.rejects(hrms.correctAttendance(partnerId+'-foreign',row.id,values),/not found/);
 const writes=await Promise.allSettled([hrms.correctAttendance(partnerId,row.id,values),hrms.correctAttendance(partnerId,row.id,values)]);
 assert.equal(writes.filter(r=>r.status==='fulfilled').length,1);
 const audit=await hrms.attendanceAudit(partnerId,row.id);assert.equal(audit.length,1);assert.equal(audit[0].data.before.status,'Present');assert.equal(audit[0].data.after.status,'Late');
 const updated=await prisma.attendanceCheckIn.findUnique({where:{id:row.id}});
 assert.equal(updated.checkInLat,14);
 values.expected=JSON.stringify({checkInAt:updated.checkInAt.toISOString(),checkOutAt:updated.checkOutAt.toISOString(),status:updated.status});
 const overlap=await prisma.attendanceCheckIn.create({data:{employeeId:employee.id,checkInLat:14,checkInLng:78,checkInAt:new Date('2020-01-11T03:30:00Z'),checkOutAt:new Date('2020-01-11T11:30:00Z')}});
 await assert.rejects(hrms.correctAttendance(partnerId,row.id,{...values,checkOutAt:'2020-01-11T17:30'}),/overlaps/);
 await prisma.payslip.create({data:{employeeId:employee.id,month:1,year:2020,basicPay:100,netPay:100,status:'Finalized'}});
 await assert.rejects(hrms.correctAttendance(partnerId,row.id,values),/finalized/);
 assert.equal((await hrms.attendanceAudit(partnerId,row.id)).length,1);
 const longShift=await prisma.attendanceCheckIn.create({data:{employeeId:employee.id,checkInLat:14,checkInLng:78,checkInAt:new Date('2019-01-10T03:30:00Z'),checkOutAt:new Date('2019-03-10T11:30:00Z')}});
 await prisma.payslip.create({data:{employeeId:employee.id,month:2,year:2019,basicPay:100,netPay:100,status:'Paid'}});
 await assert.rejects(hrms.correctAttendance(partnerId,longShift.id,{...values,expected:JSON.stringify({checkInAt:longShift.checkInAt.toISOString(),checkOutAt:longShift.checkOutAt.toISOString(),status:longShift.status}),checkInAt:'2019-01-10T09:00',checkOutAt:'2019-01-10T17:00'}),/finalized/);
 assert.equal((await hrms.listAttendanceHistory(partnerId,{from:'invalid',page:1})).length,0);
});

test('employee access provisioning and login throttles remain atomic across concurrent requests', async()=>{
 const employee=await prisma.employee.create({data:{partnerId,name:'Portal employee'}});
 const jar=new Map();
 const auth=load('src/lib/hrmsEmployeeAccess.ts',{
  'node:crypto':crypto,jose:await import('jose'),'next/headers':{cookies:()=>({get:k=>jar.has(k)?{value:jar.get(k)}:undefined,set:(k,v)=>jar.set(k,v)})},
  '@/lib/prisma':{prisma},'@/lib/env':{env:{partnerSessionSecret:()=> 'isolated-postgres-employee-session-secret'}},
  '@/lib/passwords':load('src/lib/passwords.ts',{crypto}),'@/lib/withRecordLock':lock,
  '@/lib/tenant':{...tenant,assertModuleAccess:async()=>{}},'@/lib/requirePartnerSession':{requireSessionPartnerId:async()=>partnerId},
 },{TextEncoder,process:{env:{NODE_ENV:'test'}}});
 const grants=await Promise.all([auth.issueEmployeeAccess(partnerId,employee.id),auth.issueEmployeeAccess(partnerId,employee.id)]);
 assert.equal(await prisma.partnerStaff.count({where:{partnerId,role:'HrmsEmployee'}}),1);
 const outcomes=await Promise.all(grants.map(g=>auth.loginEmployee(partnerId,g.loginId,g.password)));
 assert.equal(outcomes.filter(Boolean).length,1);
 await auth.changeEmployeePassword(partnerId,'Employee-test-password-2026','Employee-test-password-2026');
 assert.equal((await auth.getEmployeeSession(partnerId)).employee.id,employee.id);
 assert.equal(await auth.getEmployeeSession(partnerId+'-foreign'),null);
 await auth.issueEmployeeAccess(partnerId,employee.id,true);
 assert.equal(await auth.getEmployeeSession(partnerId),null);
 const issued=await auth.issueEmployeeAccess(partnerId,employee.id);
 // Clear the prior successful-login counter, then prove concurrent failures
 // cannot overwrite each other's increments.
 await prisma.businessRecord.deleteMany({where:{partnerId,moduleSlug:'hrms-login-attempts'}});
 await Promise.all(Array.from({length:8},()=>auth.loginEmployee(partnerId,issued.loginId,'wrong')));
 const throttle=await prisma.businessRecord.findFirst({where:{partnerId,moduleSlug:'hrms-login-attempts'}});
 assert.equal(throttle.data.count,5);
 assert.equal(await auth.loginEmployee(partnerId,issued.loginId,issued.password),false);
});

test('HRMS concurrent approvals count leave once and payroll finalization prevents overwrite', async()=>{
 const employee=await prisma.employee.create({data:{partnerId,name:'Payroll employee'}});
 const foreign=await prisma.employee.create({data:{partnerId:partnerId+'-other',name:'Foreign manager'}});
 await assert.rejects(hrms.createEmployee(partnerId,{name:'Invalid manager',reportingManagerId:foreign.id}),/manager/);
 await assert.rejects(hrms.createLeaveRequest(partnerId,{employeeId:employee.id,leaveType:'Annual',startDate:end,endDate:start}),/dates/);
 const leave=await hrms.createLeaveRequest(partnerId,{employeeId:employee.id,leaveType:'Annual',startDate:start,endDate:start});
 const results=await Promise.all([hrms.decideLeaveRequest(partnerId,leave.id,'Approved','owner'),hrms.decideLeaveRequest(partnerId,leave.id,'Approved','owner')]);
 assert.equal(results.filter(r=>r.ok).length,1);
 assert.equal((await hrms.listLeaveBalances(partnerId,employee.id))[0].usedDays,1);
 const additional=await Promise.all([1,2].map(()=>hrms.createLeaveRequest(partnerId,{employeeId:employee.id,leaveType:'Sick',startDate:start,endDate:start})));
 await Promise.all(additional.map(row=>hrms.decideLeaveRequest(partnerId,row.id,'Approved','owner')));
 assert.equal((await hrms.listLeaveBalances(partnerId,employee.id)).find(row=>row.leaveType==='Sick').usedDays,2);
 assert.equal((await hrms.listLeaveBalances(partnerId+'-other',employee.id)).length,0);
 const input={employeeId:employee.id,month:1,year:2030,basicPayRupees:1000,allowancesRupees:100,deductionsRupees:50};
 await assert.rejects(hrms.upsertPayslip(partnerId,{...input,deductionsRupees:2000}),/Net pay/);
 await assert.rejects(hrms.upsertPayslip(partnerId,{...input,month:1.5}),/month/);
 const payslip=await hrms.upsertPayslip(partnerId,input);
 await assert.rejects(hrms.setPayslipStatus(partnerId,payslip.id,'Paid'),/Finalize/);
 await Promise.all([hrms.setPayslipStatus(partnerId,payslip.id,'Finalized'),hrms.setPayslipStatus(partnerId,payslip.id,'Finalized')]);
 await assert.rejects(hrms.upsertPayslip(partnerId,input),/overwritten/);
 await hrms.setPayslipStatus(partnerId,payslip.id,'Paid');
 await assert.rejects(hrms.setPayslipStatus(partnerId,payslip.id,'Draft'),/reopened/);
});

test('Rentals reserves cleaning time, blocks maintenance/inactive assets and preserves return settlement', async()=>{
 const rules=load('src/lib/rentalAssetPolicy.ts');
 const policy=rules.readRentalAssetPolicy({turnaroundMinutes:60});
 const asset=await rentals.createAsset(partnerId,{assetName:'Preparation test',policy});
 await assert.rejects(rentals.createAsset(partnerId,{assetName:' preparation test '}),/already exists/);
 const input={assetId:asset.id,assetName:asset.assetName,renter:'Test',bookingStart:start,bookingEnd:end,rentalAmount:100,depositAmount:1000};
 const booking=await rentals.createAgreement(partnerId,input);assert.equal(booking.ok,true);
 const nextStart=new Date(end.getTime()+30*60000),nextEnd=new Date(end.getTime()+120*60000);
 assert.equal((await rentals.createAgreement(partnerId,{...input,assetId:undefined,bookingStart:nextStart,bookingEnd:nextEnd})).ok,false);
 assert.equal((await rentals.createAgreement(partnerId,{...input,bookingStart:new Date(end.getTime()+60*60000),bookingEnd:nextEnd})).ok,true);
 await assert.rejects(rentals.updateAsset(partnerId,asset.id,{assetName:asset.assetName,policy:rules.readRentalAssetPolicy({turnaroundMinutes:90})}),/overlaps/);
 await assert.rejects(rentals.updateAsset(partnerId,asset.id,{assetName:asset.assetName,policy:rules.readRentalAssetPolicy({maintenanceStart:start.toISOString(),maintenanceEnd:end.toISOString()})}),/Maintenance overlaps/);
 const maintenanceStart=new Date(end.getTime()+86400000),maintenanceEnd=new Date(end.getTime()+90000000);
 await rentals.updateAsset(partnerId,asset.id,{assetName:asset.assetName,policy:rules.readRentalAssetPolicy({...policy,maintenanceStart:maintenanceStart.toISOString(),maintenanceEnd:maintenanceEnd.toISOString()})});
 await assert.rejects(rentals.createAgreement(partnerId,{...input,bookingStart:maintenanceStart,bookingEnd:maintenanceEnd}),/maintenance/);
 await rentals.updateAsset(partnerId,asset.id,{assetName:asset.assetName,isActive:false});
 await assert.rejects(rentals.createAgreement(partnerId,{...input,assetId:undefined}),/inactive/);
 const first=await rentals.returnAsset(partnerId,booking.id,100,'Condition inspected');
 const repeated=await rentals.returnAsset(partnerId,booking.id,900,'Changed');
 assert.equal(first.refundableAmount,900);assert.equal(repeated.refundableAmount,900);
 assert.equal((await rentals.getAgreement(partnerId,booking.id)).returnNotes,'Condition inspected');
 await assert.rejects(rentals.updateAgreement(partnerId,booking.id,input),/returned booking/);
 await assert.rejects(rentals.deleteAgreement(partnerId,booking.id),/settlement/);
 const legacy=await prisma.rentalAgreement.create({data:{partnerId,assetName:'Legacy unit',renter:'Test',bookingStart:start,bookingEnd:end,rentalAmount:100}});
 const legacyAsset=await rentals.createAsset(partnerId,{assetName:'Legacy unit'});
 await rentals.updateAsset(partnerId,legacyAsset.id,{assetName:'Renamed unit'});
 assert.equal((await prisma.rentalAgreement.findUnique({where:{id:legacy.id}})).assetId,legacyAsset.id);
 assert.equal((await rentals.createAgreement(partnerId,{...input,assetId:legacyAsset.id,assetName:'Renamed unit'})).ok,false);
});

test.after(async()=>{
 await base.journalLine.deleteMany({where:{journalEntry:{partnerId:{in:[partnerId,partnerId+'-other']}}}});
 await base.journalEntry.deleteMany({where:{partnerId:{in:[partnerId,partnerId+'-other']}}});
 await base.chartOfAccount.deleteMany({where:{partnerId:{in:[partnerId,partnerId+'-other']}}});
 await base.fiscalPeriod.deleteMany({where:{partnerId:{in:[partnerId,partnerId+'-other']}}});
 await base.partnerStaff.deleteMany({where:{partnerId,role:'HrmsEmployee'}});
 const employeeScope={employee:{partnerId:{in:[partnerId,partnerId+'-other']}}};
 await base.leaveBalance.deleteMany({where:employeeScope});
 await base.attendanceCheckIn.deleteMany({where:employeeScope});await base.leaveRequest.deleteMany({where:employeeScope});await base.payslip.deleteMany({where:employeeScope});
 await base.employee.deleteMany({where:{partnerId:{in:[partnerId,partnerId+'-other']}}});await base.officeLocation.deleteMany({where:{partnerId}});
 await base.pointsLedgerEntry.deleteMany({where:{member:{partnerId}}});
 await base.loyaltyMember.deleteMany({where:{partnerId}});
 await base.eventResourceAllocation.deleteMany({where:{eventBooking:{partnerId}}});
 await base.eventBooking.deleteMany({where:{partnerId}});
 await base.venue.deleteMany({where:{partnerId}}); await base.eventResource.deleteMany({where:{partnerId}});
 await base.rentalAgreement.deleteMany({where:{partnerId}});await base.rentalAsset.deleteMany({where:{partnerId}});
 await base.prescription.deleteMany({where:{appointment:{partnerId}}});await base.appointment.deleteMany({where:{partnerId}});await base.patient.deleteMany({where:{partnerId}});
 await base.businessRecord.deleteMany({where:{OR:[{partnerId},{partnerId:{startsWith:prefix}}]}});
 await base.moduleAccessKey.deleteMany({where:{partnerId:{startsWith:prefix}}});
 await base.numberingCounter.deleteMany({where:{scopeKey:`signup-prefix:${prefix}`}});
 await base.partner.deleteMany({where:{partnerTypeId:{startsWith:prefix}}});await base.partnerType.deleteMany({where:{id:{startsWith:prefix}}});
 await base.$disconnect();
});
