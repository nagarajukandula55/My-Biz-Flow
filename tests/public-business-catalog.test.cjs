const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');
const offerings = [
  {slug:'hotel',title:'Hotel',modules:['hotel'],workflow:['Reserve a room']},
  {slug:'accounting',title:'Accounting & GST',modules:['accounting','accounting-gst','billing'],workflow:[]},
  {slug:'service-centre',title:'Service Centre',modules:['service-centre'],workflow:[]},
];
const {buildPublicBusinessCatalog}=load('src/lib/publicBusinessCatalog.ts',{'@/lib/businessOfferings':{BUSINESS_OFFERINGS:offerings}});
test('all packages stay discoverable; signup uses active configured IDs and complete accounting bundle',()=>{
  const cards=buildPublicBusinessCatalog([
    {id:'hotel',status:'Inactive',defaultModules:['hotel']},
    {id:'accounting',status:'Active',defaultModules:['accounting']},
    {id:'service-centre',status:'Active',defaultModules:['service-centre']},
    {id:'custom-hotel',status:'Active',defaultModules:['hotel']},
  ]);
  assert.equal(cards.length,3);
  assert.deepEqual(Array.from(cards[0].signupOptions,o=>o.id),['custom-hotel']);
  assert.equal(cards[1].signupOptions.length,0);
  assert.equal(cards[2].signupOptions[0].id,'service-centre');
  const combined=buildPublicBusinessCatalog([{id:'accounting',status:'Active',defaultModules:['accounting','accounting-gst','billing']}]);
  assert.equal(combined[1].signupOptions[0].id,'accounting');
});
