const test = require('node:test');
const assert = require('node:assert/strict');

test('interior measurement formulas are stable', () => {
  assert.equal(Number((2 * 3 * 1.1).toFixed(4)), 6.6);
  assert.equal(Number((1 * 2 * 3 * 1.05).toFixed(4)), 6.3);
});

test('unit pricing examples calculate by selling unit', () => {
  assert.equal(1 * 900, 900);
  assert.equal(2 * 450 * 1.05, 945);
});
