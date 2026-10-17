const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const load = require('./loadModule.cjs');
if (process.env.MBF_ISOLATED_TEST !== '1' || !['postgresql://ci:ci@127.0.0.1:55439/ci','postgresql://ci:ci@localhost:5432/ci','postgres://ci:ci@localhost:5432/ci'].includes(process.env.DATABASE_URL)) throw Error('Disposable local CI database required');
const { PrismaClient } = require('@prisma/client');
const base = new PrismaClient();
const db = load('src/lib/databaseTransaction.ts', { 'node:async_hooks': require('node:async_hooks'), '@/lib/databaseClientContext': load('src/lib/databaseClientContext.ts') });
const prisma = db.transactionAwareClient(base);
const locks = load('src/lib/withRecordLock.ts', { '@/lib/prisma': { prisma }, '@/lib/databaseTransaction': db });
const settlement = load('src/lib/rentalSettlement.ts');
const payments = load('src/lib/rentalPayments.ts', {
  '@/lib/prisma': { prisma }, '@/lib/withRecordLock': locks, '@/lib/rentalSettlement': settlement,
  '@/lib/tenant': { assertModuleAccess: async () => {}, assertPartnerCanWrite: async () => {} },
  '@/lib/requirePartnerSession': { requireSessionPartnerId: async () => {} },
});
const partnerId = 'rental-correction-' + crypto.randomUUID();
test('rental correction transactions serialize competing reversals, retain evidence and support corrected replacement', async () => {
  const booking = await base.rentalAgreement.create({ data: {
    partnerId, assetName: 'Synthetic correction unit', renter: 'Synthetic renter',
    bookingStart: new Date('2030-01-01T00:00:00Z'), bookingEnd: new Date('2030-01-02T00:00:00Z'),
    rentalAmount: 10000, depositAmount: 50000, status: 'Confirmed',
  } });
  await payments.recordRentalPayment(partnerId, booking.id, { paymentKind: 'Deposit receipt', paymentAmount: '500', paymentReference: 'original', paymentMethod: 'Manual UPI' });
  const values = { correctionOriginal: 'original', correctionReference: 'correct-1', correctionReason: 'Recorded to wrong bank reference' };
  const attempts = await Promise.allSettled([
    payments.reverseRentalPayment(partnerId, booking.id, values),
    payments.reverseRentalPayment(partnerId, booking.id, { ...values, correctionReference: 'correct-2' }),
  ]);
  assert.equal(attempts.filter(item => item.status === 'fulfilled').length, 1);
  let entries = await payments.getRentalPayments(partnerId, booking.id);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].reference, 'original');
  assert.equal(entries[0].amount, 50000);
  assert.equal(entries[1].actor, `Owner ${partnerId}`);
  assert.equal(entries[0].paymentMethod, 'Manual UPI');
  assert.equal(entries[1].paymentMethod, 'Manual UPI');
  await payments.reverseRentalPayment(partnerId, booking.id, { ...values, correctionReference: entries[1].reference });
  assert.equal((await payments.getRentalPayments(partnerId, booking.id)).length, 2);
  await payments.recordRentalPayment(partnerId, booking.id, { paymentKind: 'Deposit receipt', paymentAmount: '300', paymentReference: 'replacement' });
  await base.rentalAgreement.update({ where: { id: booking.id }, data: { returned: true, status: 'Completed', damageCharge: 10000 } });
  await payments.recordRentalPayment(partnerId, booking.id, { paymentKind: 'Deposit refund', paymentAmount: '200', paymentReference: 'refund' });
  await assert.rejects(payments.reverseRentalPayment(partnerId, booking.id, { ...values, correctionOriginal: 'replacement', correctionReference: 'invalid' }), /refunded money/);
  await assert.rejects(payments.reverseRentalPayment(partnerId + '-foreign', booking.id, values), /not found/);
  entries = await payments.getRentalPayments(partnerId, booking.id);
  assert.equal(entries.length, 4);
  assert.equal(settlement.rentalSettlement({ ...booking, returned: true, damageCharge: 10000 }, entries).depositHeld, 10000);
});
test.after(async () => {
  await base.businessRecord.deleteMany({ where: { partnerId } });
  await base.rentalAgreement.deleteMany({ where: { partnerId } });
  await base.$disconnect();
});
