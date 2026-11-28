const test = require('node:test'), assert = require('node:assert/strict'), load = require('./loadModule.cjs');
const pos = load('src/lib/pos/stockPolicy.ts');
const line = { sku: 'sku', qty: 3, unitPrice: 20, discount: 0, taxRate: 0 };
test('Admin sessions reject expired, wrong-purpose and legacy cookies; login redirect stays local',async()=>{
 const jose=await import('jose'),secret='isolated-admin-secret-at-least-32-characters';
 const auth=load('src/lib/adminAuth.ts',{'jose':jose,'./env':{env:{superAdminSecret:()=>secret}}},{TextEncoder});
 assert.equal(await auth.isValidAdminCookie(await auth.computeAdminCookieValue()),true);
 assert.equal(await auth.isValidAdminCookie('legacy-hash'),false);
 const expired=await new jose.SignJWT({purpose:'platform-admin-session'}).setProtectedHeader({alg:'HS256'}).setExpirationTime(1).sign(new TextEncoder().encode(secret));
 assert.equal(await auth.isValidAdminCookie(expired),false);
 const other=await new jose.SignJWT({purpose:'pos-staff-session'}).setProtectedHeader({alg:'HS256'}).setExpirationTime('1h').sign(new TextEncoder().encode(secret));
 assert.equal(await auth.isValidAdminCookie(other),false);
 for(const url of ['https://external.invalid','//external.invalid','/admin/../../external','/admin\\evil']) assert.equal(auth.safeAdminNextPath(url),'/admin/system');
 assert.equal(auth.safeAdminNextPath('/admin/plans'),'/admin/plans');
});
test('POS public signup cannot create an account or staff before owner authorization',async()=>{
 const denied=()=>{throw new Error('database must not be reached');};
 const action=load('src/app/partner/[partnerId]/pos/staff/actions.ts',{
  '@/lib/pos/posSession':{},'@/lib/requirePartnerSession':{requireSessionPartnerId:async()=>{throw new Error('Owner required');}},
  '@/lib/withRecordLock':{withRecordLock:denied},'next/headers':{},'next/navigation':{},'@/lib/prisma':{},
  '@/lib/pos/posAccount':{getOrCreatePosAccount:denied,createPosStaff:denied},'@/lib/pos/posAuth':{},
 });
 await assert.rejects(action.signupPosStaffAction('victim',new FormData()),/Owner required/);
});
test('POS sessions require a valid signed purpose and reject raw staff IDs or other session types',async()=>{
 const jose=await import('jose');
 const secret='isolated-test-secret-at-least-32-characters';
 const session=load('src/lib/pos/posSession.ts',{'jose':jose,'@/lib/env':{env:{partnerSessionSecret:()=>secret}}},{TextEncoder});
 assert.equal(await session.verifyPosSessionToken('staff-id'),undefined);
 const token=await session.createPosSessionToken('partner','staff');
 assert.equal((await session.verifyPosSessionToken(token)).partnerId,'partner');
 assert.equal(await session.verifyPosSessionToken(token+'tampered'),undefined);
 const owner=await new jose.SignJWT({partnerId:'partner'}).setProtectedHeader({alg:'HS256'}).setExpirationTime('1h').sign(new TextEncoder().encode(secret));
 assert.equal(await session.verifyPosSessionToken(owner),undefined);
});
test('POS rejects invalid money and quantities and aggregates repeated SKU demand', () => {
  for (const change of [{qty:-1}, {qty:NaN}, {qty:0.5}, {unitPrice:Infinity}, {unitPrice:1.001}, {discount:100}, {taxRate:101}]) {
    assert.throws(() => pos.validatePosInput({lines:[{...line,...change}],tenders:[{method:'Cash',amount:60}]}));
  }
  assert.throws(() => pos.validatePosInput({lines:[line],tenders:[{method:'Cash',amount:NaN}]}));
  assert.throws(() => pos.validatePosInput({lines:[line],tenders:[{method:'Cash',amount:60.001}]}));
  const stock = [{ id:'sku', qtyOnHand:8, reservedQty:3, availableQty:5 }];
  assert.throws(() => pos.planPosStock(stock,[line,line]), /stock/);
  const update = pos.planPosStock(stock,[line])[0];
  assert.equal(update.data.qtyOnHand,5); assert.equal(update.data.availableQty,2);
  assert.throws(() => pos.planPosStock([{...stock[0],condition:'Defective'}],[line]));
});
test('POS records net Billing payment rows for mixed tenders and cash change',()=>{
 assert.deepEqual(Array.from(pos.allocatePosPayments([{method:'Cash',amount:50},{method:'UPI',amount:75.35}],100.35),row=>({...row})),[
  {method:'Cash',amount:25},{method:'UPI',amount:75.35},
 ]);
 assert.throws(()=>pos.allocatePosPayments([{method:'UPI',amount:110}],100),/Change cannot exceed/);
 assert.throws(()=>pos.allocatePosPayments([{method:'Cash',amount:90}],100),/less than/);
});
test('manufacturing aggregates repeated material lines and refuses invalid BOM quantities', () => {
  const {aggregateMaterialRequirements: aggregate} = load('src/lib/manufacturingStockPolicy.ts');
  const rows = aggregate([{materialId:'MAT',materialLabel:'M',quantity:3},{materialId:'MAT — M',materialLabel:'M',quantity:4}]);
  assert.equal(rows.length,1); assert.equal(rows[0].quantity,7);
  assert.throws(() => aggregate([{materialId:'MAT',materialLabel:'M',quantity:-1}]));
});

test('till cash excludes voided sales and drafts, subtracts cash change and current-session refunds',async()=>{
 const till=load('src/lib/pos/posTill.ts',{'@/lib/withRecordLock':{},'@/lib/prisma':{},'@/lib/businessRecords':{listBusinessRecords:async(_p,slug)=>slug==='pos'?[
  {status:'Completed',posTillSessionId:'t',tenders:[{method:'Cash',amount:120}],changeDue:20},
  {status:'Voided',posTillSessionId:'t',tenders:[{method:'Cash',amount:50}],changeDue:0},
  {status:'Draft',posTillSessionId:'t',tenders:[{method:'Cash',amount:500}]},
 ]:[{tillSessionId:'t',refundMethod:'Cash',refundAmount:10}]}});
 assert.equal(await till.computeExpectedCash('p',{id:'t',openingFloat:50}),140);
});

test('POS cash returns fail before data access when no open till is available',async()=>{
 let reads=0;
 const returns=load('src/lib/pos/posReturns.ts',{
  '@/lib/withRecordLock':{withRecordLock:async(_scope,_id,fn)=>fn()},
  '@/lib/businessRecords':{getBusinessRecord:async()=>{reads++;throw Error('should not read sale without a cash till');}},
  '@/lib/sample-data/pos':{extractSaleFromRecord:()=>({})},
  '@/lib/stockLots':{restoreSerializedUnits:async()=>{}},
  '@/lib/pos/posTill':{getOpenTillSession:async()=>null},
  '@/lib/pos/posBillingReversal':{calculatePosCredit:()=>({totalAmount:100}),recordPosBillingReversal:async()=>{throw Error('unexpected reversal');}},
 });
 await assert.rejects(returns.createPosReturn({partnerId:'p',saleId:'sale',lines:[],refundMethod:'Cash',reason:'',staffId:'s',staffName:'S',tillSessionId:null}),/requires an open till/);
 assert.equal(reads,0);
});

test('POS over-refund and fractional quantities fail before stock writes', async () => {
 let stockReads = 0;
 const returns = load('src/lib/pos/posReturns.ts', {
  '@/lib/withRecordLock': { withRecordLock: async (_scope, _id, fn) => fn() },
  '@/lib/businessRecords': {
   getBusinessRecord: async () => ({ id: 'sale' }),
   listBusinessRecords: async () => [],
   updateBusinessRecord: async () => { stockReads++; },
   createBusinessRecord: async () => { stockReads++; },
  },
  '@/lib/sample-data/pos': { extractSaleFromRecord: () => ({
   status: 'Completed', totalAmount: 90,
   lines: [{ id: 'line', sku: 'stock', productName: 'Item', qty: 1, unitPrice: 100, discount: 0, taxRate: 0 }],
  }) },
  '@/lib/stockLots': { restoreSerializedUnits: async () => {} },
  '@/lib/pos/posTill': { getOpenTillSession: async () => null },
  '@/lib/pos/posBillingReversal': { calculatePosCredit: () => ({ totalAmount:100 }), recordPosBillingReversal: async () => { throw Error('unexpected reversal'); } },
 });
 const params = { partnerId: 'p', saleId: 'sale', refundMethod: 'UPI', refundReference:'completed-ref', reason: '', staffId: 's', staffName: 'S', tillSessionId: null };
 await assert.rejects(returns.createPosReturn({ ...params, lines: [{ lineId: 'line', qty: 0.5 }] }), /Invalid return quantity/);
 await assert.rejects(returns.createPosReturn({ ...params, lines: [{ lineId: 'line', qty: 1 }] }), /Refund exceeds/);
 assert.equal(stockReads, 0);
});

test('POS return rejects forged refund methods and a cash drawer closed after form submission', async () => {
 let writes=0;
 const returns=load('src/lib/pos/posReturns.ts',{
  '@/lib/withRecordLock':{withRecordLock:async(_scope,_id,fn)=>fn()},
  '@/lib/businessRecords':{getBusinessRecord:async()=>({id:'sale',locationId:'outlet'}),createBusinessRecord:async()=>{writes++;}},
  '@/lib/sample-data/pos':{extractSaleFromRecord:()=>({status:'Completed'})},
  '@/lib/stockLots':{restoreSerializedUnits:async()=>{}},
  '@/lib/pos/posTill':{getOpenTillSession:async()=>null},
  '@/lib/pos/posBillingReversal':{calculatePosCredit:()=>({totalAmount:100}),recordPosBillingReversal:async()=>{throw Error('unexpected reversal');}},
 });
 const input={partnerId:'p',saleId:'sale',lines:[],refundMethod:'Cash',reason:'',staffId:'s',staffName:'S',tillSessionId:'closed',posAccountId:'account'};
 await assert.rejects(returns.createPosReturn({...input,refundMethod:'Voucher'}),/valid refund method/);
 await assert.rejects(returns.createPosReturn(input),/no longer open/);
 assert.equal(writes,0);
});

test('till opening serializes requests and rejects mismatched accounts',async()=>{
 let tail=Promise.resolve(),opened=0;
 const till=load('src/lib/pos/posTill.ts',{
  '@/lib/withRecordLock':{withRecordLock:(_kind,_partner,fn)=>{const result=tail.then(fn);tail=result.catch(()=>{});return result;}},
  '@/lib/prisma':{prisma:{posAccount:{findUnique:async()=>({partnerId:'p'})},posStaff:{findFirst:async()=>({id:'s'})},posTillSession:{findFirst:async()=>opened?{openedAt:new Date()}:null,create:async()=>{opened++;return {};}}}},
  '@/lib/businessRecords':{listBusinessRecords:async()=>[{id:'l',status:'Active',mappedWarehouse:'warehouse-a'}]},
 });
 const input={partnerId:'p',posAccountId:'a',locationId:'l',openedByStaffId:'s',openingFloat:0};
 const results=await Promise.allSettled([till.openTillSession(input),till.openTillSession(input)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(opened,1);
 await assert.rejects(till.openTillSession({...input,partnerId:'other'}),/belong/);
 await assert.rejects(till.openTillSession({...input,openingFloat:NaN}),/Invalid/);
});
