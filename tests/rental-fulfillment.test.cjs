const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');
const rules = load('src/lib/rentalFulfillment.ts');
const entry = (reference, kind, quantity, damagePaise = 0) => ({ reference, kind, quantity, damagePaise, notes: 'Condition checked', recipient: kind === 'Pickup' ? 'Synthetic renter' : '', at: '2030-01-01T10:00:00Z', actor: 'Owner synthetic' });

test('partial rental movements retain references, reject excessive quantities and settle only when all units are accounted for', () => {
  const entries = [entry('pickup-1', 'Pickup', 2)];
  assert.equal(rules.validateRentalUnitEntry(5, entries, entries[0]), false);
  assert.throws(() => rules.validateRentalUnitEntry(5, entries, { ...entries[0], quantity: 1 }), /reference/);
  assert.throws(() => rules.validateRentalUnitEntry(5, entries, entry('too-many', 'Pickup', 4)), /exceeds/);
  assert.throws(() => rules.validateRentalUnitEntry(5, entries, entry('too-many', 'Return', 3)), /exceeds/);
  assert.equal(rules.validateRentalUnitEntry(5, entries, entry('return-1', 'Return', 1, 100)), true);
  entries.push(entry('return-1', 'Return', 1, 100));
  assert.equal(rules.rentalUnitSummary(5, entries).outstanding, 1);
  assert.equal(rules.rentalUnitSummary(5, entries).complete, false);
  entries.push(entry('release', 'Release uncollected', 3), entry('return-2', 'Return', 1, 200));
  const summary = rules.rentalUnitSummary(5, entries);
  assert.equal(summary.complete, true);
  assert.equal(summary.damagePaise, 300);
  assert.equal(summary.outstanding, 0);
  assert.throws(() => rules.validateRentalUnitEntry(5, entries, entry('extra', 'Pickup', 1)), /exceeds/);
});

test('rental movement validation rejects unknown actions, fractional units, unexplained releases and unsafe damage', () => {
  const pickup = entry('pickup', 'Pickup', 2);
  for (const change of [{ kind: 'Unknown' }, { quantity: 0 }, { quantity: 1.5 }, { notes: '' }, { recipient: '' }, { reference: '' }, { damagePaise: 1 }]) assert.throws(() => rules.validateRentalUnitEntry(3, [], { ...pickup, ...change }));
  assert.throws(() => rules.validateRentalUnitEntry(3, [pickup], entry('return', 'Return', 1, -1)));
  assert.throws(() => rules.validateRentalUnitEntry(3, [pickup], entry('return', 'Return', 1, 2147483648)));
  assert.throws(() => rules.validateRentalUnitEntry(3, [pickup, entry('return-1', 'Return', 1, 2147483647)], entry('return-2', 'Return', 1, 1)), /Total damage/);
});

test('rental reservation windows keep contract capacity, then only outstanding units and late return preparation', () => {
  const booking = { bookingStart: new Date('2030-01-01T09:00:00Z'), bookingEnd: new Date('2030-01-01T10:00:00Z'), status: 'Ongoing', returned: false };
  const entries = [entry('pickup', 'Pickup', 3), { ...entry('return', 'Return', 1), at: '2030-01-01T11:00:00Z' }];
  const now = Date.parse('2030-01-01T11:30:00Z');
  const windows = rules.rentalReservationWindows(booking, 5, entries, 3600000, now);
  assert.equal(windows.filter(window => window.end === Infinity).reduce((sum, window) => sum + window.quantity, 0), 2);
  assert.equal(windows.find(window => window.end === Date.parse('2030-01-01T12:00:00Z')).quantity, 1);
  assert.equal(windows.reduce((sum, window) => sum + window.quantity, 0), 5);
  assert.equal(windows.filter(window => window.end > now).reduce((sum, window) => sum + window.quantity, 0), 3);
  const legacy = rules.rentalReservationWindows({ ...booking, returned: true, returnedAt: new Date('2030-01-01T11:00:00Z') }, 5, undefined, 3600000, now);
  assert.equal(legacy[0].end, Date.parse('2030-01-01T12:00:00Z'));
});
