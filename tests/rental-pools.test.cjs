const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');
const policy = load('src/lib/rentalAssetPolicy.ts');
const terms = load('src/lib/rentalTerms.ts');

test('rental pool capacities and booking quantities validate integers and default legacy records to one unit', () => {
  assert.equal(policy.readRentalAssetPolicy({}).stockQuantity, 1);
  assert.equal(terms.readRentalTerms({}).quantity, 1);
  for (const quantity of [0, -1, 0.5, 10001, 'bad', Infinity]) {
    assert.throws(() => policy.readRentalAssetPolicy({ stockQuantity: quantity }), /Quantity/);
    assert.throws(() => terms.readRentalTerms({ quantity }), /Quantity/);
  }
  assert.equal(policy.readRentalAssetPolicy({ stockQuantity: '10000' }).stockQuantity, 10000);
});

test('rental capacity uses peak concurrent units, allows adjacent windows and keeps overdue units reserved', () => {
  const window = (start, end, quantity) => ({ start, end, quantity });
  assert.equal(policy.exceedsRentalCapacity(3, [window(0, 10, 2), window(10, 20, 2)]), false);
  assert.equal(policy.exceedsRentalCapacity(3, [window(0, 11, 2), window(10, 20, 2)]), true);
  assert.equal(policy.exceedsRentalCapacity(3, [window(0, 20, 1), window(0, 10, 2), window(10, 20, 2)]), false);
  assert.equal(policy.exceedsRentalCapacity(3, [window(0, Infinity, 2), window(100, 110, 2)]), true);
});

test('calculated rental rates are per unit while fixed quotes remain totals for the line', () => {
  const start = new Date('2030-01-01T00:00:00Z'), end = new Date('2030-01-02T01:00:00Z');
  const daily = terms.readRentalTerms({ quantity: 3, rateUnit: 'Daily', rateRupees: '100' });
  assert.equal(terms.rentalQuote(daily, start, end, 999), 60000);
  assert.equal(terms.rentalQuote({ ...daily, rateUnit: 'Fixed quote' }, start, end, 12345), 12345);
  assert.throws(() => terms.rentalQuote({ ...daily, quantity: 10000, ratePaise: 2147483647 }, start, end, 0), /exceeds/);
});
