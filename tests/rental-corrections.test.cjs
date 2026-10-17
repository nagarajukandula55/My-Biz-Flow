const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');
const rules = load('src/lib/rentalSettlement.ts');
const booking = { rentalAmount: 10000, depositAmount: 50000, damageCharge: 10000, returned: true, status: 'Completed' };
const payment = (reference, kind, amount) => ({ reference, kind, amount, note: '', at: '2026-10-09T00:00:00Z' });
const correction = original => ({ ...original, reference: 'correction-' + original.reference, reversalOf: original.reference, note: 'Wrong bank reference', actor: 'Owner synthetic' });

test('rental corrections preserve originals, permit replacement and make duplicate submission idempotent', () => {
  const original = payment('deposit', 'Deposit receipt', 50000);
  const reversal = correction(original);
  const entries = [original];
  assert.equal(rules.validateRentalReversal(booking, entries, reversal), true);
  assert.equal(entries.length, 1);
  assert.equal(original.amount, 50000);
  entries.push(reversal);
  assert.equal(rules.rentalSettlement(booking, entries).depositHeld, 0);
  assert.equal(rules.validateRentalReversal(booking, entries, reversal), false);
  assert.throws(() => rules.validateRentalReversal(booking, entries, { ...reversal, note: 'Different reason' }), /reference/);
  assert.throws(() => rules.validateRentalReversal(booking, entries, { ...reversal, reference: 'second' }), /already been reversed/);
  assert.equal(rules.validateRentalPayment(booking, entries, payment('replacement', 'Deposit receipt', 50000)), true);
  assert.throws(() => rules.validateRentalPayment(booking, entries, reversal), /correction action/);
});

test('rental corrections reject orphan refunds and require dependent corrections first', () => {
  const receipt = payment('deposit', 'Deposit receipt', 50000);
  const refund = payment('refund', 'Deposit refund', 40000);
  const entries = [receipt, refund];
  assert.throws(() => rules.validateRentalReversal(booking, entries, correction(receipt)), /refunded money/);
  assert.equal(rules.validateRentalReversal(booking, entries, correction(refund)), true);
  entries.push(correction(refund));
  assert.equal(rules.validateRentalReversal(booking, entries, correction(receipt)), true);
  const rent = payment('rent', 'Rental receipt', 10000), rentRefund = payment('rent-refund', 'Rental refund', 10000);
  assert.throws(() => rules.validateRentalReversal({ ...booking, status: 'Cancelled' }, [rent, rentRefund], correction(rent)), /refunded money/);
});

test('rental correction input and reference collision checks fail closed', () => {
  const original = payment('deposit', 'Deposit receipt', 50000);
  const entry = correction(original);
  for (const change of [{ note: '' }, { note: 'a'.repeat(1001) }, { reference: '' }, { reference: 'a'.repeat(101) }, { reversalOf: 'missing' }, { amount: 1 }, { kind: 'Rental receipt' }]) {
    assert.throws(() => rules.validateRentalReversal(booking, [original], { ...entry, ...change }));
  }
  assert.throws(() => rules.validateRentalReversal(booking, [original], { ...entry, reference: original.reference }), /reference/);
  assert.throws(() => rules.validateRentalReversal(booking, Array.from({ length: 1000 }, () => original), entry), /limit/);
});

test('manual rental payment methods persist in corrections and cannot change on a duplicate reference', () => {
  for (const paymentMethod of ['Cash', 'Manual UPI', 'Card', 'Bank transfer', 'Other']) {
    const original = { ...payment('deposit', 'Deposit receipt', 50000), paymentMethod };
    assert.equal(rules.validateRentalPayment(booking, [], original), true);
    assert.equal(rules.validateRentalPayment(booking, [original], original), false);
    assert.equal(rules.validateRentalReversal(booking, [original], correction(original)), true);
    assert.throws(() => rules.validateRentalPayment(booking, [original], { ...original, paymentMethod: paymentMethod === 'Cash' ? 'Manual UPI' : 'Cash' }), /reference/);
  }
  assert.throws(() => rules.validateRentalPayment(booking, [], { ...payment('deposit', 'Deposit receipt', 50000), paymentMethod: 'Unknown gateway' }), /Choose Cash/);
});

test('rental correction DAL derives amounts from stored entries and checks owner/tenant before append', async () => {
  const original = payment('deposit', 'Deposit receipt', 50000);
  let entries = [original], allowed = true, writes = 0;
  const module = load('src/lib/rentalPayments.ts', {
    '@/lib/rentalSettlement': rules,
    '@/lib/requirePartnerSession': { requireSessionPartnerId: async () => { if (!allowed) throw Error('Owner required'); } },
    '@/lib/tenant': { assertModuleAccess: async () => {}, assertPartnerCanWrite: async () => {} },
    '@/lib/withRecordLock': { withRecordLock: async (scope, partnerId, fn) => { assert.equal(scope, 'rental-bookings'); return fn(); } },
    '@/lib/prisma': { prisma: {
      rentalAgreement: { findFirst: async ({ where }) => where.partnerId === 'owner' && where.id === 'booking' ? booking : null },
      businessRecord: {
        findUnique: async ({ where }) => { assert.equal(where.partnerId_moduleSlug_recordKey.partnerId, 'owner'); return { data: { entries } }; },
        update: async ({ data }) => { entries = data.data.entries; writes++; },
      },
    } },
  });
  const values = { correctionOriginal: 'deposit', correctionReference: 'correction', correctionReason: 'Wrong account reference', amount: 1, kind: 'Rental refund' };
  await module.reverseRentalPayment('owner', 'booking', values);
  assert.equal(entries.length, 2);
  assert.equal(entries[1].amount, 50000);
  assert.equal(entries[1].kind, 'Deposit receipt');
  assert.equal(entries[1].actor, 'Owner owner');
  await module.reverseRentalPayment('owner', 'booking', values);
  assert.equal(writes, 1);
  await assert.rejects(module.reverseRentalPayment('other', 'booking', values), /not found/);
  allowed = false;
  await assert.rejects(module.reverseRentalPayment('owner', 'booking', values), /Owner/);
  assert.equal(writes, 1);
});
