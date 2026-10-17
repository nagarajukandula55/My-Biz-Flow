const test=require('node:test');
const assert=require('node:assert/strict');
const load=require('./loadModule.cjs');
function harness(){
 const state={admins:['admin'],connected:'partner',modules:['service-centre'],ticket:null,workorder:null,writes:[],menus:[],messages:[],locked:false};
 const empty={};
 const mocks={
  'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status??200})}},
  '@/lib/env':{env:{telegramWebhookSecret:()=> 'synthetic',telegramBotToken:()=>undefined}},
  '@/lib/partnerData':{getPartner:async()=>({id:'partner',businessName:'Synthetic'})},
  '@/lib/businessRecords':{getBusinessRecord:async()=>({id:'WO1'})},
  '@/lib/telegram':{
   findPartnerIdByChatId:async()=>state.connected,findWorkorderByReplyMessageId:async()=>state.workorder,
   appendTelegramChatLogEntry:async(...args)=>state.writes.push(['note',...args]),
   sendRawTelegramMessage:async(...args)=>state.messages.push(args),
   setTelegramCommands:async(...args)=>{state.menus.push(args);return true;},
  },
  '@/lib/telegramTemplateDefs':{TELEGRAM_TEMPLATE_DEFS:[{key:'pna_report',command:'/pna_report',label:'Parts'}],findTelegramTemplateDefByCommand:()=>undefined},
  '@/lib/telegramTemplatesData':empty,'@/lib/telegramTemplates':{helpMessageText:async text=>text},
  '@/lib/telegramReportData':empty,'@/lib/designer/entitlements':{getVisibleModuleSlugs:async()=>state.modules},
  '@/lib/telegramReportRunner':empty,'@/lib/analyticsData':empty,'@/lib/alerts':empty,
  '@/lib/supportTickets':{findSupportTicketByReplyMessageId:async()=>state.ticket,setSupportTicketStatus:async(...args)=>state.writes.push(['resolve',...args]),appendSupportReply:async(...args)=>state.writes.push(['support',...args])},
  '@/lib/platformSettings':{getAdminChatIds:async()=>state.admins},'@/lib/reportRunLog':empty,'@/lib/plansData':empty,
  '@/lib/tenant':{assertPartnerCanWrite:async()=>{if(state.locked)throw Error('expired trial');}},
 };
 const api=load('src/app/api/telegram/webhook/route.ts',mocks);
 const send=(text,chat='admin',reply=5)=>api.POST(new Request('http://localhost/api/telegram/webhook',{method:'POST',headers:{'x-telegram-bot-api-secret-token':'synthetic'},body:JSON.stringify({message:{message_id:20,chat:{id:chat},text,...(reply?{reply_to_message:{message_id:reply}}:{})}})}));
 return {state,send};
}
test('support replies and resolution require current admin membership despite retained thread links',async()=>{
 const {state,send}=harness();state.ticket={partnerId:'partner',ticketId:'ticket'};
 for(const text of ['/resolve','support response'])await send(text,'removed-admin');
 assert.equal(state.writes.length,0);
 await send('/resolve');await send('support response');
 assert.deepEqual(state.writes.map(x=>x[0]),['resolve','support']);
});
test('workorder replies require current chat binding, module access and writable subscription',async()=>{
 const {state,send}=harness();state.workorder={partnerId:'partner',workorderId:'WO1'};
 state.connected='other';await send('note');assert.equal(state.writes.length,0);
 state.connected='partner';state.modules=['hrms'];await send('note');assert.equal(state.writes.length,0);
 state.modules=['service-centre'];state.locked=true;await assert.rejects(send('note'),/expired trial/);
 state.locked=false;await send('note');assert.equal(state.writes.length,1);assert.equal(state.writes[0][3].messageId,20);
});
test('direct workorder notes carry delivery identity and respect the write gate',async()=>{
 const {state,send}=harness();state.locked=true;await assert.rejects(send('/note WO1 hello','partner',null),/expired trial/);
 assert.equal(state.writes.length,0);state.locked=false;await send('/note WO1 hello','partner',null);
 assert.equal(state.writes[0][3].messageId,20);
});
test('partner help and default native menus omit unrelated Service Centre commands while Service Centre retains them',async()=>{
 const {state,send}=harness();state.modules=['hrms'];await send('/help','partner',null);
 assert.ok(!state.menus[0][0].some(x=>x.command==='pna_report'));
 assert.ok(!JSON.stringify(state.messages).includes('/pna_report'));
 state.modules=['service-centre'];await send('/help','partner',null);
 assert.ok(state.menus[1][0].some(x=>x.command==='pna_report'));
 assert.ok(JSON.stringify(state.messages[1]).includes('/pna_report'));
 await send('/syncmenu','admin',null);
 assert.ok(!state.menus[2][0].some(x=>x.command==='workorders'));
 assert.ok(state.menus[3][0].some(x=>x.command==='workorders'));
});
