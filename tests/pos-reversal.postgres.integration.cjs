const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const load = require('./loadModule.cjs');
const url = process.env.DATABASE_URL;
if (process.env.MBF_ISOLATED_TEST !== '1' || !['postgresql://ci:ci@127.0.0.1:55439/ci','postgresql://ci:ci@localhost:5432/ci','postgres://ci:ci@localhost:5432/ci'].includes(url)) throw new Error('Disposable local CI database required');

const {PrismaClient} = require('@prisma/client');
const base = new PrismaClient({datasources:{db:{url}}});
const db = load('src/lib/databaseTransaction.ts',{'node:async_hooks':require('node:async_hooks'),'@/lib/databaseClientContext':load('src/lib/databaseClientContext.ts')});
const prisma = db.transactionAwareClient(base);
const lock = load('src/lib/withRecordLock.ts',{'@/lib/prisma':{prisma},'@/lib/databaseTransaction':db});
const partnerId = `pos-reversal-${crypto.randomUUID()}`;
const store = {
 getBusinessRecord:async(p,m,id)=>{const row=await prisma.businessRecord.findUnique({where:{partnerId_moduleSlug_recordKey:{partnerId:p,moduleSlug:m,recordKey:id}}});return row?{...row.data,id:row.recordKey}:undefined;},
 listBusinessRecords:async(p,m)=>(await prisma.businessRecord.findMany({where:{partnerId:p,moduleSlug:m}})).map(row=>({...row.data,id:row.recordKey})),
 createBusinessRecord:async(p,m,data)=>{const id=crypto.randomUUID();await prisma.businessRecord.create({data:{partnerId:p,moduleSlug:m,recordKey:id,data}});return {...data,id};},
 updateBusinessRecord:async(p,m,id,data)=>prisma.businessRecord.update({where:{partnerId_moduleSlug_recordKey:{partnerId:p,moduleSlug:m,recordKey:id}},data:{data}}),
};
const credit = load('src/lib/pos/posBillingReversal.ts',{
 '@/lib/businessRecords':store,
 '@/lib/designer/numbering':{getNextNumber:async()=>`CN-${crypto.randomUUID()}`},
});
const returns = load('src/lib/pos/posReturns.ts',{
 '@/lib/withRecordLock':lock,'@/lib/businessRecords':store,
 '@/lib/sample-data/pos':{extractSaleFromRecord:(record)=>record},
 '@/lib/stockLots':{restoreSerializedUnits:async()=>{}},
 '@/lib/pos/posTill':{getOpenTillSession:async()=>({id:'till'})},
 '@/lib/pos/posBillingReversal':credit,
});
const line={id:'line',sku:'stock',productName:'Part',qty:2,unitPrice:100,discount:0,taxRate:18};
const seed=async(m,id,data)=>base.businessRecord.create({data:{partnerId,moduleSlug:m,recordKey:id,data}});

test('POS return serializes retries and atomically links one refund, stock restoration and credit note',async()=>{
 await seed('inventory-stock','stock',{qtyOnHand:3,reservedQty:0,availableQty:3});
 await seed('pos','sale',{status:'Completed',locationId:'outlet',invoiceId:'invoice',totalAmount:236,lines:[line]});
 await seed('billing','invoice',{sourcePosSaleId:'sale',paymentStatus:'Paid',amountPaid:236,totalAmount:236,customer:'Walk-in Customer',issueDate:'2030-01-01'});
 const params={partnerId,saleId:'sale',lines:[{lineId:'line',qty:2}],refundMethod:'Cash',reason:'Returned',staffId:'manager',staffName:'Manager',tillSessionId:'till',posAccountId:'account'};
 const attempts=await Promise.allSettled([returns.createPosReturn(params),returns.createPosReturn(params)]);
 assert.equal(attempts.filter(result=>result.status==='fulfilled').length,1);
 assert.equal((await store.getBusinessRecord(partnerId,'inventory-stock','stock')).qtyOnHand,5);
 const notes=await store.listBusinessRecords(partnerId,'billing-credit-notes');
 assert.equal(notes.length,1);
 assert.equal(notes[0].totalAmount,236);
 assert.equal(notes[0].linkedInvoiceId,'invoice');
 assert.equal((await store.getBusinessRecord(partnerId,'billing','invoice')).posCreditNoteId,notes[0].id);
 assert.equal((await store.listBusinessRecords(partnerId,'pos-returns')).length,1);
});

test('POS return missing invoice rolls back without restoring stock or recording a refund',async()=>{
 await seed('pos','orphan',{status:'Completed',locationId:'outlet',invoiceId:'missing',totalAmount:236,lines:[line]});
 const params={partnerId,saleId:'orphan',lines:[{lineId:'line',qty:2}],refundMethod:'UPI',refundReference:'completed-ref',reason:'Returned',staffId:'manager',staffName:'Manager',tillSessionId:null,posAccountId:'account'};
 await assert.rejects(returns.createPosReturn(params),/invoice/);
 assert.equal((await store.getBusinessRecord(partnerId,'inventory-stock','stock')).qtyOnHand,5);
 assert.equal((await store.listBusinessRecords(partnerId,'pos-returns')).length,1);
});

test.after(async()=>{await base.businessRecord.deleteMany({where:{partnerId}});await base.$disconnect();});
