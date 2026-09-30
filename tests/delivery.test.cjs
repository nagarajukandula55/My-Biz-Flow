const test=require('node:test'),assert=require('node:assert/strict'),load=require('./loadModule.cjs');

test('SMS and WhatsApp report acceptance only from a successful provider response',async()=>{
 for(const [file,method,env,response] of [
  ['src/lib/sms.ts','sendSms',{smsApiKey:()=> 'key',smsSenderId:()=> 'sender'},{type:'success',message:'request-id'}],
  ['src/lib/whatsapp.ts','sendWhatsAppMessage',{whatsappBusinessPhoneNumberId:()=> 'phone',whatsappAccessToken:()=> 'key'},{messages:[{id:'message-id'}]}],
 ]) {
  let ok=false, body=response;
  const sender=load(file,{'@/lib/env':{env}},{fetch:async(url,options)=>{assert.ok(options.signal);return {ok,json:async()=>body};}});
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
  '@/lib/whatsapp':{sendWhatsAppMessage:async()=>{network++;return accepted;}},'@/lib/sms':{},
 });
 const send=()=>api.sendTemplateToLead('p1',{leadId:'lead',templateId:'template',sentById:'agent'});
 assert.equal((await send()).status,'failed');assert.equal(record.status,'failed');
 accepted=true;assert.equal((await send()).status,'accepted');
 configured=false;assert.equal((await send()).status,'not-configured');assert.equal(network,2);
});
