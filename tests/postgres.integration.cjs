// This suite refuses every database except the disposable local CI service.
const assert = require('node:assert/strict');
const test = require('node:test');
const crypto = require('node:crypto');
const asyncHooks = require('node:async_hooks');
const load = require('./loadModule.cjs');
const url = process.env.DATABASE_URL;
if (process.env.MBF_ISOLATED_TEST !== '1' || !['postgres://ci:ci@localhost:5432/ci','postgresql://ci:ci@localhost:5432/ci','postgresql://ci:ci@127.0.0.1:55439/ci'].includes(url)) {
 throw new Error('Integration tests require MBF_ISOLATED_TEST=1 and the disposable localhost CI database. Production connections are forbidden.');
}
const { PrismaClient } = require('@prisma/client');
const base = new PrismaClient({ datasources: { db: { url } } });
const db = load('src/lib/databaseTransaction.ts', { 'node:async_hooks': asyncHooks, '@/lib/databaseClientContext': load('src/lib/databaseClientContext.ts') });
const prisma = db.transactionAwareClient(base);
const lock = load('src/lib/withRecordLock.ts', { '@/lib/prisma': { prisma }, '@/lib/databaseTransaction': db });
const partnerId = 'isolated-test-' + crypto.randomUUID();

test('PostgreSQL serializes stock mutations, rolls back writes and suppresses rollback notifications', async () => {
 const where = { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: 'inventory-stock', recordKey: 'stock' } };
 await base.businessRecord.create({ data: { partnerId, moduleSlug: 'inventory-stock', recordKey: 'stock', data: { qtyOnHand: 10 } } });
 let delivered = 0;
 const consume = () => lock.withRecordLock('inventory-partner', partnerId, async () => {
  const row = await prisma.businessRecord.findUniqueOrThrow({ where });
  await new Promise(resolve => setTimeout(resolve, 30));
  await prisma.businessRecord.update({ where, data: { data: { qtyOnHand: row.data.qtyOnHand - 1 } } });
 });
 await Promise.all([consume(), consume()]);
 assert.equal((await base.businessRecord.findUniqueOrThrow({ where })).data.qtyOnHand, 8);
 await assert.rejects(lock.withRecordLock('inventory-partner', partnerId, async () => {
  await prisma.businessRecord.update({ where, data: { data: { qtyOnHand: 0 } } });
  await db.afterDatabaseCommit(async () => { delivered++; });
  throw new Error('abort stock operation');
 }), /abort stock operation/);
 assert.equal((await base.businessRecord.findUniqueOrThrow({ where })).data.qtyOnHand, 8);
 assert.equal(delivered, 0);
});

test('PostgreSQL overlapping recurring runs create exactly one numbered invoice', async () => {
 const format = load('src/lib/designer/numberingFormat.ts');
 const numbering = load('src/lib/designer/numbering.ts', { '@/lib/prisma': { prisma }, './numberingFormat': format });
 const runner = load('src/lib/recurringInvoiceRunner.ts', {
  'node:crypto': crypto, '@/lib/prisma': { prisma }, '@/lib/tenant': { assertPartnerCanWrite: async id => assert.equal(id, partnerId) },
  '@/lib/designer/numbering': numbering,
  '@/lib/sample-data/billing-recurring': { RECURRING_FREQUENCIES: ['Monthly'], advanceNextRunDate: () => '2026-10-30' },
 });
 await base.businessRecord.create({ data: { partnerId, moduleSlug: 'billing-recurring', recordKey: 'template', data: { status: 'Active', frequency: 'Monthly', nextRunDate: '2026-09-30', totalAmount: 100 } } });
 const run = () => runner.createDueRecurringInvoice(partnerId, 'template', '2026-09-30', '2026-09-30');
 assert.equal((await Promise.all([run(), run()])).filter(Boolean).length, 1);
 const rows = await base.businessRecord.findMany({ where: { partnerId, moduleSlug: 'billing' } });
 assert.equal(rows.length, 1); assert.ok(rows[0].data.invoiceNumber);
});


test('real inventory helpers serialize first receipts and roll back bucket transfers', async () => {
 const records = load('src/lib/businessRecords.ts', {
  '@/lib/prisma': { prisma }, '@/lib/safeCache': { safeCache: fn => fn },
  '@/lib/tenant': { assertPartnerCanWrite: async id => assert.equal(id, partnerId) },
 });
 const read = load('src/lib/inventoryRead.ts', { '@/lib/businessRecords': records });
 const stock = load('src/lib/inventoryStock.ts', { '@/lib/inventoryRead': read, '@/lib/businessRecords': records, '@/lib/withRecordLock': lock });
 const receive = () => stock.adjustStockQty(partnerId, 'MAT-TEST', 'MAT-TEST', 'Test warehouse', 5);
 await Promise.all([receive(), receive()]);
 assert.equal(await stock.getQtyOnHand(partnerId, 'MAT-TEST', 'Test warehouse'), 10);
 const matching = (await records.listBusinessRecords(partnerId, 'inventory-stock')).filter(row => row.materialId === 'MAT-TEST');
 assert.equal(matching.length, 1);
 await assert.rejects(lock.withRecordLock('inventory-partner', partnerId, async () => {
  await stock.moveGoodToDefective(partnerId, 'MAT-TEST', 'MAT-TEST', 'Test warehouse', 2);
  throw new Error('later ledger failure');
 }), /later ledger failure/);
 assert.equal(await stock.getQtyOnHand(partnerId, 'MAT-TEST', 'Test warehouse'), 10);
 assert.equal(await stock.getQtyOnHand(partnerId, 'MAT-TEST', 'Test warehouse', 'Defective'), 0);
});

test.after(async () => {
 await base.businessRecord.deleteMany({ where: { partnerId: '__platform_payment_delivery__', recordKey: { startsWith: partnerId } } });
 await base.businessRecord.deleteMany({ where: { partnerId } });
 await base.numberingCounter.deleteMany({ where: { scopeKey: { startsWith: `partner:${partnerId}:` } } });
 await base.$disconnect();
});

test('durable delivery jobs roll back with payment work and concurrent workers claim each channel once', async () => {
 const payment = { partnerId, razorpayPaymentId: partnerId, amount: 100, planName: 'Test', billingCycle: 'Monthly', capturedAt: new Date().toISOString() };
 const queueClient = new Proxy(base, { get(target, key) {
  if (key === '$transaction') return fn => target.$transaction(async tx => { await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'Asia/Calcutta'"); return fn(tx); });
  if (key === 'subscriptionPayment') return {findUnique:async()=>({partnerId,amount:100})};
  const value=target[key]; return typeof value==='function'?value.bind(target):value;
 }});
 const queue = load('src/lib/paymentDeliveryQueue.ts', {'@/lib/prisma':{prisma:queueClient},'node:crypto':crypto});
 await assert.rejects(base.$transaction(async tx => { await queue.enqueuePaymentDelivery(tx,payment); throw new Error('rollback'); }));
 assert.equal(await base.businessRecord.count({where:{partnerId:queue.DELIVERY_OWNER,recordKey:{startsWith:partnerId}}}),0);
 await base.$transaction(tx=>queue.enqueuePaymentDelivery(tx,payment));
 await base.$transaction(tx=>queue.enqueuePaymentDelivery(tx,payment));
 const channels=[];
 const send=async job=>{channels.push(job.channel);await new Promise(resolve=>setTimeout(resolve,25));return true;};
 await Promise.all(Array.from({length:6},()=>queue.processPaymentDelivery(send,partnerId)));
 assert.equal(channels.length,3);assert.equal(new Set(channels).size,3);
 assert.equal(await queue.processPaymentDelivery(send,partnerId),false);
 const rows=await base.businessRecord.findMany({where:{partnerId:queue.DELIVERY_OWNER,recordKey:{startsWith:partnerId}}});
 assert.ok(rows.every(row=>row.data.status==='Accepted'&&row.data.attempts===1), JSON.stringify(rows.map(row=>({status:row.data.status,attempts:row.data.attempts,updatedAt:row.updatedAt}))));
 await base.businessRecord.update({where:{id:rows[0].id},data:{data:{...rows[0].data,status:'Processing'},updatedAt:new Date(Date.now()-11*60*1000)}});
 await queue.processPaymentDelivery(send,partnerId);
 assert.equal(channels.length,3);
 assert.equal((await base.businessRecord.findUnique({where:{id:rows[0].id}})).data.status,'Review');
});

test('POS invoice failure rolls back stock; concurrent sales cannot oversell', async () => {
 const records=load('src/lib/businessRecords.ts',{'@/lib/prisma':{prisma},'@/lib/safeCache':{safeCache:fn=>fn},'@/lib/tenant':{assertPartnerCanWrite:async id=>assert.equal(id,partnerId)}});
 const stock=await records.createBusinessRecord(partnerId,'inventory-stock',{qtyOnHand:5,reservedQty:0,availableQty:5});
 let failInvoice=true;
 const actions=load('src/app/partner/[partnerId]/pos/checkout/actions.ts',{
  'next/navigation':{redirect:url=>{throw new Error('REDIRECT '+url);}},'next/cache':{revalidatePath:()=>{}},
  '@/lib/businessRecords':{...records,createBusinessRecord:async(p,slug,data)=>{if(failInvoice&&slug==='billing')throw new Error('invoice failure');return records.createBusinessRecord(p,slug,data);}},
  '@/lib/sample-data/pos':load('src/lib/sample-data/pos.ts'),
  '@/lib/pos/posAuth':{requirePosStaffAction:async()=>({id:'staff',name:'Test',staffCode:'TEST',posAccountId:'account'})},
  '@/lib/pos/posTill':{getOpenTillSession:async()=>({id:'till'})},'@/lib/withRecordLock':lock,
  '@/lib/designer/numbering':{getNextNumber:async()=> 'TEST-INVOICE'},'@/lib/pos/stockPolicy':load('src/lib/pos/stockPolicy.ts'),
 });
 const input={lines:[{id:'line',sku:String(stock.id),productName:'Test',qty:4,unitPrice:10,taxRate:0,discount:0}],tenders:[{method:'Cash',amount:40}],locationId:'outlet',tillSessionId:'till'};
 await assert.rejects(actions.completeSaleAction(partnerId,input),/invoice failure/);
 assert.equal((await records.getBusinessRecord(partnerId,'inventory-stock',String(stock.id))).qtyOnHand,5);
 assert.equal((await records.listBusinessRecords(partnerId,'pos')).length,0);
 failInvoice=false;
 const result=await Promise.allSettled([actions.completeSaleAction(partnerId,input),actions.completeSaleAction(partnerId,input)]);
 assert.equal(result.filter(r=>r.status==='rejected'&&r.reason.message.startsWith('REDIRECT')).length,1);
 assert.equal((await records.getBusinessRecord(partnerId,'inventory-stock',String(stock.id))).qtyOnHand,1);
 assert.equal((await records.listBusinessRecords(partnerId,'pos')).length,1);
});
