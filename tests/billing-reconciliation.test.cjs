const test=require('node:test'), assert=require('node:assert/strict'),load=require('./loadModule.cjs');
const rules=load('src/lib/billingReconciliationRules.ts');
test('credit notes reverse allocations; payments require distinct receipt and receivable accounts',()=>{
 const date=new Date('2026-10-10'), data={issueDate:'2026-10-10',subtotal:100,taxAmount:18,totalAmount:118,noteType:'Credit Note'};
 const line=(accountId,accountType,debit,credit)=>({accountId,debit,credit,account:{accountType,partnerId:'p'}});
 const credit=[line('receivable','Asset',0,11800),line('income','Income',10000,0),line('tax','Liability',1800,0)];
 assert.equal(rules.reconcileDocument('p','billing-credit-notes',data,date,credit),null);
 assert.match(rules.reconcileDocument('p','billing-credit-notes',{...data,noteType:'Debit Note'},date,credit),/allocation/);
 const payment={amount:50,date:'2026-10-10'}, receipt=[line('bank','Asset',5000,0),line('receivable','Asset',0,5000)];
 assert.equal(rules.reconcileDocument('p','billing-payments',payment,date,receipt),null);
 assert.match(rules.reconcileDocument('p','billing-payments',payment,date,[receipt[0],{...receipt[1],accountId:'bank'}]),/distinct/);
 assert.match(rules.reconcileDocument('p','billing-payments',{...payment,amount:51},date,receipt),/totals/);
 assert.throws(()=>rules.billingDocumentKind('service-centre'));
});
test('billing reconciliation validates paise totals and rejects malformed or cancelled invoices',()=>{
 const invoice={subtotal:100,taxAmount:18,totalAmount:118};
 assert.equal(rules.invoiceAmounts(invoice).total,11800);
 assert.equal(rules.invoiceAmounts({...invoice,discountAmount:10,roundOff:0.5,totalAmount:108.5}).total,10850);
 for(const bad of [{totalAmount:119},{subtotal:'oops'},{taxAmount:-1},{subtotal:100.001},{paymentStatus:'Draft'},{paymentStatus:'Cancelled'}]) assert.throws(()=>rules.invoiceAmounts({...invoice,...bad}));
});
test('billing reconciliation checks allocation as well as double-entry balance and tenant ownership',()=>{
 assert.equal(rules.reconcileInvoiceDate({issueDate:'2026-10-10'},new Date('2026-10-10T00:00:00Z')),null);
 assert.match(rules.reconcileInvoiceDate({issueDate:'2026-10-10'},new Date('2026-10-11T00:00:00Z')),/date differs/);
 assert.match(rules.reconcileInvoiceDate({issueDate:'2026-02-30'},new Date('2026-03-02T00:00:00Z')),/invalid/);
 const amounts=rules.invoiceAmounts({subtotal:100,taxAmount:18,totalAmount:118});
 const line=(accountType,debit,credit,partnerId='p')=>({debit,credit,account:{accountType,partnerId}});
 const lines=[line('Asset',11800,0),line('Income',0,10000),line('Liability',0,1800)];
 assert.equal(rules.reconcileInvoiceLines('p',amounts,lines),null);
 assert.match(rules.reconcileInvoiceLines('p',amounts,[line('Asset',11800,0),line('Income',0,11800)]),/allocation/);
 assert.match(rules.reconcileInvoiceLines('p',amounts,[...lines.slice(0,2),line('Liability',0,1800,'other')]),/foreign/);
 assert.match(rules.reconcileInvoiceLines('p',amounts,[line('Asset',11800,0),line('Income',0,10000)]),/totals/);
});
