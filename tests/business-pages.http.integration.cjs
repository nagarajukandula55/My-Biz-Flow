const assert=require('node:assert/strict');
const load=require('./loadModule.cjs');
const modules=load('src/lib/designer/modules.ts').MODULES;
const base='http://127.0.0.1:3317';
async function main(){
 const index=await fetch(base+'/business-types');assert.equal(index.status,200);
 for(const module of modules.filter(m=>m.slug!=='accounting-gst')){
  const res=await fetch(base+'/business-types/'+module.slug);assert.equal(res.status,200,module.slug);
  const html=await res.text();assert.ok(!html.includes('"digest":'),module.slug);
  for(const heading of ['How your team works','Tools in this workspace','Settings and reporting','Mobile and web access','Getting started'])assert.ok(html.includes(heading),module.slug+': '+heading);
 }
 const alias=await fetch(base+'/business-types/accounting-gst?ref=test-code',{redirect:'manual'});
 assert.equal(alias.status,307);assert.ok(alias.headers.get('location').endsWith('/business-types/accounting?ref=test-code'));
 assert.equal((await fetch(base+'/business-types/not-a-module')).status,404);
 console.log('Directory and 25 detail pages render; Accounting/GST redirect preserves referral; unknown type returns 404.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
