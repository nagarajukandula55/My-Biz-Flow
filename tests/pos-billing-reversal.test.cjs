const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');

const saleLine = { id:'line', sku:'stock', productName:'Part', qty:3, unitPrice:100, discount:1, taxRate:18 };

test('POS reversal creates a linked itemized credit note and keeps the issued invoice history', async () => {
 const writes = [];
 const invoice = { id:'invoice', sourcePosSaleId:'sale', paymentStatus:'Paid', amountPaid:352.82, totalAmount:352.82, customer:'Walk-in Customer' };
 const reversal = load('src/lib/pos/posBillingReversal.ts', {
  '@/lib/businessRecords': {
   getBusinessRecord:async()=>invoice,
   listBusinessRecords:async()=>[],
   createBusinessRecord:async(_p,kind,values)=>{ writes.push({kind,values}); return {id:'note'}; },
   updateBusinessRecord:async(_p,kind,id,values)=>{writes.push({kind,id,values});},
  },
  '@/lib/designer/numbering': {getNextNumber:async()=> 'CN-0001'},
 });
 const result = await reversal.recordPosBillingReversal({partnerId:'p',saleId:'sale',invoiceId:'invoice',lines:[{line:saleLine,qty:3}],refundMethod:'Cash',refundReference:'',reason:'Returned'});
 assert.equal(result.noteId,'note');
 assert.equal(result.totalAmount,352.82);
 assert.equal(writes[0].values.linkedInvoiceId,'invoice');
 assert.equal(writes[0].values.noteNumber,'CN-0001');
 assert.equal(writes[0].values.noteType,'Credit Note');
 assert.equal(writes[0].values.items[0].quantity,3);
 assert.equal(writes[1].values.posCreditNoteId,'note');
 assert.equal(writes[1].values.amountPaid,352.82);
 assert.equal(writes[1].values.amountRefunded,352.82);
});

test('POS reversal rejects foreign, unpaid, previously credited or over-refunded invoices before writes', async () => {
 let writes=0;
 const invoice={id:'invoice',sourcePosSaleId:'sale',paymentStatus:'Paid',amountPaid:100};
 const note={linkedInvoiceId:'invoice',noteType:'Credit Note'};
 const make=(current,notes=[])=>load('src/lib/pos/posBillingReversal.ts',{
  '@/lib/businessRecords':{
   getBusinessRecord:async()=>current,listBusinessRecords:async()=>notes,
   createBusinessRecord:async()=>{writes++;},updateBusinessRecord:async()=>{writes++;},
  },
  '@/lib/designer/numbering':{getNextNumber:async()=>{writes++;return 'unexpected';}},
 });
 const input={partnerId:'p',saleId:'sale',invoiceId:'invoice',lines:[{line:saleLine,qty:3}],refundMethod:'Cash',refundReference:'',reason:'Return'};
 await assert.rejects(make({...invoice,sourcePosSaleId:'other'}).recordPosBillingReversal(input),/does not match/);
 await assert.rejects(make({...invoice,paymentStatus:'Sent'}).recordPosBillingReversal(input),/does not match/);
 await assert.rejects(make(invoice,[note]).recordPosBillingReversal(input),/already references/);
 await assert.rejects(make(invoice).recordPosBillingReversal(input),/exceeds/);
 assert.equal(writes,0);
});
