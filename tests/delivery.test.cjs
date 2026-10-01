const test=require('node:test'),assert=require('node:assert/strict'),load=require('./loadModule.cjs');
test('SMS flow payload uses mapped variables and refuses missing or invalid recipients',()=>{
 const {buildSmsFlowPayload:build}=load('src/lib/smsFlowMapping.ts',{'@/lib/prisma':{}});
 const mapping={flowId:'approved-flow',senderId:'SENDER',variables:{VAR1:'name'},enabled:true};
 const payload=build(mapping,'+91 9876543210',{name:'Test'});
 assert.equal(payload.flow_id,'approved-flow');assert.equal(payload.recipients[0].mobiles,'919876543210');assert.equal(payload.recipients[0].VAR1,'Test');
 assert.throws(()=>build(mapping,'invalid',{name:'Test'}));assert.throws(()=>build(mapping,'919876543210',{}));
});

test('payment delivery cron denies unauthorized callers before claiming jobs',async()=>{
 const denied=()=>{throw new Error('worker called');};
 const route=load('src/app/api/cron/payment-delivery/route.ts',{
  'next/server':{NextResponse:{json:(body,options)=>({body,...options})}},'@/lib/env':{env:{cronSecret:()=>undefined}},
  '@/lib/cronAuthorization':load('src/lib/cronAuthorization.ts'),'@/lib/paymentDeliveryQueue':{processPaymentDelivery:denied},
  '@/lib/subscriptionPaymentReceipt':{sendPaymentDelivery:denied},
 });
 assert.equal((await route.GET({headers:{get:()=>null}})).status,401);
});

test('SMS and WhatsApp report acceptance only from a successful provider response',async()=>{
 for(const [file,method,env,response] of [
  ['src/lib/sms.ts','sendSms',{smsApiKey:()=> 'key',smsSenderId:()=> 'sender'},{type:'success',message:'request-id'}],
  ['src/lib/whatsapp.ts','sendWhatsAppMessage',{whatsappBusinessPhoneNumberId:()=> 'phone',whatsappAccessToken:()=> 'key'},{messages:[{id:'message-id'}]}],
 ]) {
  let ok=false, body=response;
  const sender=load(file,{'@/lib/env':{env},'@/lib/smsFlowMapping':{getSmsFlowMapping:async()=>({}),buildSmsFlowPayload:()=>({})}},{fetch:async(url,options)=>{assert.ok(options.signal);return {ok,json:async()=>body};}});
  assert.equal(await sender[method]('recipient','message'),false);
  ok=true;body={error:'rejected'};assert.equal(await sender[method]('recipient','message'),false);
  body=response;assert.equal(await sender[method]('recipient','message'),true);
 }
});

test('telecalling records failed and unconfigured sends honestly',async()=>{
 let configured=true,accepted=false,record,network=0;
 const api=load('src/lib/telecalling/messaging.ts',{
  '@/lib/prisma':{prisma:{
   lead:{findUniqueOrThrow:async()=>({id:'lead',partnerId:'p1',name:'Lead',phone:'phone'})},
   messageTemplate:{findUniqueOrThrow:async()=>({id:'template',partnerId:'p1',channel:'whatsapp',body:'text'})},
   partnerStaff:{findFirst:async()=>({id:'agent'})},messageLog:{create:async({data})=>{record=data;}},
  }},
  '@/lib/tenant':{assertPartnerScope:(a,b)=>assert.equal(a,b)},'@/lib/telecalling/templatesData':{fillTemplate:()=> 'text'},
  '@/lib/env':{env:{whatsappBusinessPhoneNumberId:()=> configured?'phone':undefined,whatsappAccessToken:()=> 'key'}},
  '@/lib/whatsapp':{sendWhatsAppMessage:async()=>{network++;return accepted;}},'@/lib/sms':{},'@/lib/smsFlowMapping':{},
 });
 const send=()=>api.sendTemplateToLead('p1',{leadId:'lead',templateId:'template',sentById:'agent'});
 assert.equal((await send()).status,'failed');assert.equal(record.status,'failed');
 accepted=true;assert.equal((await send()).status,'accepted');
 configured=false;assert.equal((await send()).status,'not-configured');assert.equal(network,2);
});
