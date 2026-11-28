const test=require('node:test');
const assert=require('node:assert/strict');
const load=require('./loadModule.cjs');

test('Clinic patient writes and reads deny disabled modules and expired trials before Prisma',async()=>{
 let allowed=false,trial=false,reads=0;
 const clinic=load('src/lib/clinic.ts',{
  '@/lib/withRecordLock':{},
  '@/lib/tenant':{
   assertModuleAccess:async()=>{if(!allowed)throw Error('Clinic disabled');},
   assertPartnerCanWrite:async()=>{if(!trial)throw Error('Trial expired');},
  },
  '@/lib/bookingValidation':{},
  '@/lib/prisma':{prisma:{patient:{findMany:async()=>{reads++;return [];},create:async()=>{reads++;}}}},
  '@/lib/businessRecords':{},
 });
 await assert.rejects(clinic.listPatients('p'),/disabled/);
 await assert.rejects(clinic.createPatient('p',{name:'Patient'}),/disabled/);
 allowed=true;
 await assert.rejects(clinic.createPatient('p',{name:'Patient'}),/expired/);
 assert.equal(reads,0);
 trial=true;
 await assert.rejects(clinic.createPatient('p',{name:'  '}),/name/);
 assert.equal(reads,0);
 await clinic.listPatients('p');
 assert.equal(reads,1);
});

test('Clinic completed visits cannot be deleted, reopened or billed with rounded-away paise',async()=>{
 let writes=0, invoice;
 const appointment={id:'a',partnerId:'p',status:'Completed',invoiceId:null,consultationFee:10005,doctor:'Doctor',patient:{name:'Patient'}};
 const clinic=load('src/lib/clinic.ts',{
  '@/lib/withRecordLock':{withRecordLock:async(_scope,_id,fn)=>fn()},
  '@/lib/tenant':{assertModuleAccess:async()=>{},assertPartnerCanWrite:async()=>{}},
  '@/lib/bookingValidation':{},
  '@/lib/prisma':{prisma:{appointment:{findUnique:async()=>appointment,update:async()=>{writes++;}}}},
  '@/lib/businessRecords':{createBusinessRecord:async(_p,_slug,data)=>{invoice=data;return {id:'invoice'};}},
 });
 await clinic.completeAppointment('p','a','Repeat note');
 await assert.rejects(clinic.deleteAppointment('p','a'),/cannot be deleted/);
 await assert.rejects(clinic.setAppointmentStatus('p','a','Scheduled'),/cannot be reopened/);
 await clinic.createInvoiceFromAppointment('p','a');
 assert.equal(invoice.totalAmount,100.05);
 assert.equal(invoice.taxAmount,0);
 assert.equal(invoice.invoiceType,'Non-GST');
 assert.equal(invoice.items[0].taxRate,0);
 assert.equal(writes,1); // invoice link only
});
