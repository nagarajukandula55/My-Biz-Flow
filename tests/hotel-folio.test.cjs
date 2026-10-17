const test=require('node:test'),assert=require('node:assert/strict');
const rules=require('./loadModule.cjs')('src/lib/hotelRules.ts');
test('Hotel legacy receipts remain Guest payments and extensions preserve fixed second-payer allocation',()=>{
  const legacy={roomChargePaise:100000,entries:[{reference:'legacy',kind:'Payment',label:'Cash',amountPaise:30000,at:'2026-01-01T00:00:00Z'}]};
  let balances=rules.hotelPayerBalances(legacy);
  assert.equal(balances.length,1);assert.equal(balances[0].name,'Guest');assert.equal(balances[0].paid,30000);assert.equal(balances[0].balance,70000);
  const split={roomChargePaise:100000,split:{name:'Company',roomChargePaise:40000},entries:[{kind:'Payment',payer:'Company',amountPaise:40000},{kind:'Payment',amountPaise:30000},{kind:'Refund',amountPaise:10000}]};
  balances=rules.hotelPayerBalances({...split,roomChargePaise:200000});
  assert.equal(balances[0].charges,160000);assert.equal(balances[0].paid,20000);assert.equal(balances[0].balance,140000);
  assert.equal(balances[1].charges,40000);assert.equal(balances[1].balance,0);
  assert.equal(balances.reduce((sum,payer)=>sum+payer.balance,0),rules.hotelBalance({...split,roomChargePaise:200000}).balance);
});
