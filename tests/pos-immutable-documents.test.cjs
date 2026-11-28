const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');

test('generic Billing actions cannot forge or edit POS issued documents',async()=>{
 let writes=0;
 const action=load('src/lib/businessRecordActions.ts',{
  'next/cache':{revalidatePath:()=>{}},'next/navigation':{redirect:()=>{}},
  '@/lib/businessRecords':{
   getBusinessRecord:async()=>({id:'invoice',sourcePosSaleId:'sale'}),
   createBusinessRecord:async()=>{writes++;return {id:'new'};},
   updateBusinessRecord:async()=>{writes++;},
  },
  '@/lib/partnerData':{getPartner:async()=>null},
  '@/lib/centralApi':{notifyCentralApiBillingInvoice:async()=>{}},
  '@/lib/requirePartnerSession':{requireSessionPartnerId:async(id)=>id},
  '@/lib/withRecordLock':{withRecordLock:async(_scope,_id,fn)=>fn()},
  '@/lib/invoiceInventory':{hasInventoryLines:()=>false,finalizeInvoiceItems:()=>[]},
  '@/lib/inventoryStock':{},'@/lib/barcodeCatalog':{},'@/lib/tenant':{},
  '@/lib/recordEntitlement':{assertRecordModuleAccess:async()=>{}},
 });
 await assert.rejects(action.createBusinessRecordAction('partner','billing',{sourcePosSaleId:'sale'}),/only be issued/);
 await assert.rejects(action.createBusinessRecordAction('partner','billing-credit-notes',{sourcePosSaleId:'sale'}),/only be issued/);
 await assert.rejects(action.updateBusinessRecordAction('partner','billing','invoice',{}),/cannot be edited/);
 await assert.rejects(action.updateBusinessRecordAction('partner','billing-credit-notes','note',{}),/cannot be edited/);
 await assert.rejects(action.patchBusinessRecordAction('partner','billing','invoice',{amountPaid:0}),/cannot be edited/);
 assert.equal(writes,0);
});
