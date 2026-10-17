const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),load=require('./loadModule.cjs');
if(process.env.MBF_ISOLATED_TEST!=='1'||process.env.DATABASE_URL!=='postgresql://ci:ci@127.0.0.1:55439/ci')throw Error('Disposable local database required');
const {PrismaClient}=require('@prisma/client');const base=new PrismaClient();
const db=load('src/lib/databaseTransaction.ts',{'node:async_hooks':require('node:async_hooks'),'@/lib/databaseClientContext':load('src/lib/databaseClientContext.ts')});
const prisma=db.transactionAwareClient(base),lock=load('src/lib/withRecordLock.ts',{'@/lib/prisma':{prisma},'@/lib/databaseTransaction':db});
const partnerId='billing-reconcile-'+crypto.randomUUID();let owner=true,enabled=true;
const api=load('src/lib/billingReconciliation.ts',{'@/lib/prisma':{prisma},'@/lib/withRecordLock':lock,'@/lib/billingReconciliationRules':load('src/lib/billingReconciliationRules.ts'),'@/lib/requirePartnerSession':{requireSessionPartnerId:async()=>{if(!owner)throw Error('owner');}},'@/lib/tenant':{assertModuleAccess:async()=>{if(!enabled)throw Error('disabled');},assertPartnerCanWrite:async()=>{}}});
test('invoice journals link once, detect drift, paginate and stay tenant scoped',async()=>{
 const accounts=await Promise.all(['Asset','Income','Liability'].map((accountType,i)=>prisma.chartOfAccount.create({data:{partnerId,accountCode:String(i),accountName:accountType,accountType}})));
 await prisma.businessRecord.createMany({data:Array.from({length:51},(_,i)=>({partnerId,moduleSlug:'billing',recordKey:`INV-${String(i).padStart(3,'0')}`,data:{issueDate:'2026-10-10',subtotal:100,taxAmount:18,totalAmount:118}}))});
 const makeJournal=entryNumber=>prisma.journalEntry.create({data:{partnerId,entryNumber,entryDate:new Date('2026-10-10T00:00:00Z'),lines:{create:accounts.map((a,i)=>({accountId:a.id,debit:i===0?11800:0,credit:i===1?10000:i===2?1800:0}))}}});
 const one=await makeJournal('JE-1'),two=await makeJournal('JE-2');
 const attempts=await Promise.allSettled([api.linkInvoiceJournal(partnerId,'INV-000','JE-1'),api.linkInvoiceJournal(partnerId,'INV-000','JE-2')]);
 assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
 let report=await api.billingReconciliation(partnerId);assert.equal(report.rows.length,50);assert.equal(report.rows[0].status,'Amounts match');assert.equal(report.rows[1].status,'No linked journal');
 assert.equal((await api.billingReconciliation(partnerId,report.next)).rows.length,1);
 assert.equal((await api.billingReconciliation(partnerId+'-other')).rows.length,0);
 await assert.rejects(api.linkInvoiceJournal(partnerId+'-other','INV-000','JE-1'),/not found/);
 await prisma.businessRecord.update({where:{partnerId_moduleSlug_recordKey:{partnerId,moduleSlug:'billing',recordKey:'INV-000'}},data:{data:{issueDate:'2026-10-10',subtotal:200,taxAmount:36,totalAmount:236}}});
 assert.match((await api.billingReconciliation(partnerId)).rows[0].status,/totals/);
 const linked=await prisma.journalEntry.findFirst({where:{partnerId,sourceType:'billing',sourceRecordId:'INV-000'}});
 await prisma.journalEntry.create({data:{partnerId,entryNumber:'REV-TEST',entryDate:new Date('2026-10-10'),sourceType:'journal-reversal',sourceRecordId:linked.id}});
 assert.match((await api.billingReconciliation(partnerId)).rows[0].status,/reversed/);
 await assert.rejects(api.linkInvoiceJournal(partnerId,'INV-000',linked.entryNumber),/reversed/);
 const bank=await prisma.chartOfAccount.create({data:{partnerId,accountCode:'bank',accountName:'Bank',accountType:'Asset'}});
 const paymentData={invoiceId:'INV-001',date:'2026-10-10',amount:50};
 await prisma.businessRecord.create({data:{partnerId,moduleSlug:'billing-payments',recordKey:'PAY-1',data:paymentData}});
 const receipt=await prisma.journalEntry.create({data:{partnerId,entryNumber:'RECEIPT',entryDate:new Date('2026-10-10'),lines:{create:[{accountId:bank.id,debit:5000,credit:0},{accountId:accounts[0].id,debit:0,credit:5000}]}}});
 await api.linkInvoiceJournal(partnerId,'PAY-1',receipt.entryNumber,'billing-payments');
 assert.equal((await api.billingReconciliation(partnerId,'','billing-payments')).rows[0].status,'Amounts match');
 await prisma.businessRecord.update({where:{partnerId_moduleSlug_recordKey:{partnerId,moduleSlug:'billing-payments',recordKey:'PAY-1'}},data:{data:{...paymentData,invoiceId:'FOREIGN'}}});
 assert.match((await api.billingReconciliation(partnerId,'','billing-payments')).rows[0].status,/invoice not found/);
 await assert.rejects(api.linkInvoiceJournal(partnerId,'PAY-1',receipt.entryNumber,'billing-payments'),/invoice not found/);
 for(const [noteType,key,sign]of [['Credit Note','CN-1',-1],['Debit Note','DN-1',1]]){
  await prisma.businessRecord.create({data:{partnerId,moduleSlug:'billing-credit-notes',recordKey:key,data:{noteType,linkedInvoiceId:'INV-001',issueDate:'2026-10-10',subtotal:100,taxAmount:18,totalAmount:118}}});
  await prisma.journalEntry.create({data:{partnerId,entryNumber:key,entryDate:new Date('2026-10-10'),lines:{create:accounts.map((a,i)=>({accountId:a.id,debit:(i===0)===(sign===1)?(i===0?11800:i===1?10000:1800):0,credit:(i===0)!==(sign===1)?(i===0?11800:i===1?10000:1800):0}))}}});
  await api.linkInvoiceJournal(partnerId,key,key,'billing-credit-notes');
 }
 assert.ok((await api.billingReconciliation(partnerId,'','billing-credit-notes')).rows.every(r=>r.status==='Amounts match'));
 owner=false;await assert.rejects(api.billingReconciliation(partnerId),/owner/);owner=true;
 enabled=false;await assert.rejects(api.linkInvoiceJournal(partnerId,'INV-001','JE-1'),/disabled/);enabled=true;
});
test.after(async()=>{await prisma.journalLine.deleteMany({where:{journalEntry:{partnerId}}});await prisma.journalEntry.deleteMany({where:{partnerId}});await prisma.chartOfAccount.deleteMany({where:{partnerId}});await prisma.businessRecord.deleteMany({where:{partnerId}});await base.$disconnect();});

