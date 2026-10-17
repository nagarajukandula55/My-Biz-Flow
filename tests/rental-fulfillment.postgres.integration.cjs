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
const policy = load('src/lib/rentalAssetPolicy.ts'), terms = load('src/lib/rentalTerms.ts'), fulfillment = load('src/lib/rentalFulfillment.ts');
let ownerAllowed = true;
const common = { '@/lib/prisma': { prisma }, '@/lib/withRecordLock': locks, '@/lib/tenant': { assertModuleAccess: async () => {}, assertPartnerCanWrite: async () => {} }, '@/lib/rentalAssetPolicy': policy, '@/lib/rentalFulfillment': fulfillment, '@/lib/requirePartnerSession': { requireSessionPartnerId: async () => { if (!ownerAllowed) throw Error('Owner required'); } } };
const rentals = load('src/lib/rentals.ts', { ...common, '@/lib/rentalTerms': terms, '@/lib/bookingValidation': load('src/lib/bookingValidation.ts'), '@/lib/rentalRules': load('src/lib/rentalRules.ts', { '@/lib/format': load('src/lib/format.ts') }) });
const payments = load('src/lib/rentalPayments.ts', { ...common, '@/lib/rentalSettlement': load('src/lib/rentalSettlement.ts') });
const operations = load('src/lib/rentalUnitOperations.ts', common);
const partnerId = 'rental-fulfillment-' + crypto.randomUUID();
const now = Date.now(), date = minutes => new Date(now + minutes * 60000);
const request = asset => ({ assetId: asset.id, assetName: asset.assetName, renter: 'Synthetic renter', bookingStart: date(-60), bookingEnd: date(60), rentalAmount: 10000, depositAmount: 50000, status: 'Confirmed', terms: terms.readRentalTerms({ quantity: 5 }) });
const movement = (unitReference, unitAction, unitQuantity, unitDamage = '0') => ({ unitReference, unitAction, unitQuantity, unitDamage, unitNotes: 'Condition checked with customer', unitRecipient: unitAction === 'Pickup' ? 'Synthetic renter' : '' });

test('partial rental pickups/returns serialize, preserve financial history and settle only the final accounted unit', async () => {
  const asset = await rentals.createAsset(partnerId, { assetName: 'Partial return pool', policy: policy.readRentalAssetPolicy({ stockQuantity: 5 }) });
  const input = request(asset), booking = await rentals.createAgreement(partnerId, input);
  await payments.recordRentalPayment(partnerId, booking.id, { paymentKind: 'Deposit receipt', paymentAmount: '500', paymentReference: 'deposit', paymentMethod: 'Cash' });
  await operations.recordRentalUnitMovement(partnerId, booking.id, movement('pickup-1', 'Pickup', 2));
  await operations.recordRentalUnitMovement(partnerId, booking.id, movement('pickup-1', 'Pickup', 2));
  assert.equal((await rentals.getAgreement(partnerId, booking.id)).movements.length, 1);
  await assert.rejects(operations.recordRentalUnitMovement(partnerId, booking.id, movement('pickup-1', 'Pickup', 1)), /reference/);
  const attempts = await Promise.allSettled([operations.recordRentalUnitMovement(partnerId, booking.id, movement('pickup-2', 'Pickup', 2)), operations.recordRentalUnitMovement(partnerId, booking.id, movement('pickup-3', 'Pickup', 2))]);
  assert.equal(attempts.filter(item => item.status === 'fulfilled').length, 1);
  await operations.recordRentalUnitMovement(partnerId, booking.id, movement('return-1', 'Return', 2, '100'));
  assert.equal((await rentals.getAgreement(partnerId, booking.id)).returned, false);
  await assert.rejects(payments.recordRentalPayment(partnerId, booking.id, { paymentKind: 'Deposit refund', paymentAmount: '1', paymentReference: 'early-refund' }), /balance/);
  await assert.rejects(rentals.returnAsset(partnerId, booking.id, 0), /unit movements/);
  await assert.rejects(rentals.recordRentalPickup(partnerId, booking.id, { receivedBy: 'X', condition: 'Good' }), /unit movements/);
  await assert.rejects(rentals.updateAgreement(partnerId, booking.id, input), /immutable/);
  await assert.rejects(rentals.deleteAgreement(partnerId, booking.id), /retained/);
  await assert.rejects(operations.recordRentalUnitMovement(partnerId + '-foreign', booking.id, movement('foreign', 'Return', 1)), /not found/);
  ownerAllowed = false;
  try { await assert.rejects(operations.recordRentalUnitMovement(partnerId, booking.id, movement('unauthorized', 'Return', 1)), /Owner/); } finally { ownerAllowed = true; }
  await operations.recordRentalUnitMovement(partnerId, booking.id, movement('release-1', 'Release uncollected', 1));
  await operations.recordRentalUnitMovement(partnerId, booking.id, movement('return-2', 'Return', 2, '200'));
  await operations.recordRentalUnitMovement(partnerId, booking.id, movement('return-2', 'Return', 2, '200'));
  const closed = await rentals.getAgreement(partnerId, booking.id);
  assert.equal(closed.returned, true);
  assert.equal(closed.status, 'Completed');
  assert.equal(closed.damageCharge, 30000);
  assert.equal(closed.refundableAmount, 20000);
  assert.equal(closed.rentalAmount, 10000);
  assert.equal(closed.movements.length, 5);
  await payments.recordRentalPayment(partnerId, booking.id, { paymentKind: 'Deposit refund', paymentAmount: '200', paymentReference: 'settled-refund' });
  await assert.rejects(operations.recordRentalUnitMovement(partnerId, booking.id, movement('extra', 'Return', 1)), /exceeds/);
});

test('partial overdue returns release only available units after preparation and block capacity/maintenance conflicts', async () => {
  const asset = await rentals.createAsset(partnerId, { assetName: 'Late partial pool', policy: policy.readRentalAssetPolicy({ stockQuantity: 5, turnaroundMinutes: 60 }) });
  const input = request(asset), booking = await rentals.createAgreement(partnerId, input);
  await operations.recordRentalUnitMovement(partnerId, booking.id, movement('pickup', 'Pickup', 3));
  await base.rentalAgreement.update({ where: { id: booking.id }, data: { bookingEnd: date(-30) } });
  await operations.recordRentalUnitMovement(partnerId, booking.id, movement('return-1', 'Return', 1));
  assert.ok(await rentals.checkAssetConflict(partnerId, asset.id, asset.assetName, date(31), date(45), undefined, 3));
  assert.equal(await rentals.checkAssetConflict(partnerId, asset.id, asset.assetName, date(31), date(45), undefined, 2), null);
  assert.equal(await rentals.checkAssetConflict(partnerId, asset.id, asset.assetName, date(61), date(75), undefined, 3), null);
  await assert.rejects(rentals.updateAsset(partnerId, asset.id, { assetName: asset.assetName, policy: policy.readRentalAssetPolicy({ stockQuantity: 1, turnaroundMinutes: 60 }) }), /capacity/);
  await assert.rejects(rentals.scheduleMaintenance(partnerId, asset.id, { maintenanceStart: date(120).toISOString(), maintenanceEnd: date(180).toISOString() }), /overlaps/);
  await operations.recordRentalUnitMovement(partnerId, booking.id, movement('return-2', 'Return', 2));
  await operations.recordRentalUnitMovement(partnerId, booking.id, movement('release', 'Release uncollected', 2));
  assert.ok(await rentals.checkAssetConflict(partnerId, asset.id, asset.assetName, date(31), date(45), undefined, 5));
  assert.equal(await rentals.checkAssetConflict(partnerId, asset.id, asset.assetName, date(61), date(75), undefined, 5), null);
});

test('legacy handovers seed immutable pickup evidence; ongoing bookings without evidence cannot infer partial quantities', async () => {
  const asset = await rentals.createAsset(partnerId, { assetName: 'Legacy handover pool', policy: policy.readRentalAssetPolicy({ stockQuantity: 5 }) });
  const input = request(asset), booking = await rentals.createAgreement(partnerId, input);
  await rentals.recordRentalPickup(partnerId, booking.id, { receivedBy: 'Synthetic customer', condition: 'Legacy pickup condition', reference: 'legacy-evidence' });
  await operations.recordRentalUnitMovement(partnerId, booking.id, movement('partial-return', 'Return', 2));
  const partial = await rentals.getAgreement(partnerId, booking.id);
  assert.equal(partial.movements[0].quantity, 5);
  assert.equal(partial.movements[0].notes, 'Legacy pickup condition');
  assert.equal(partial.handover.reference, 'legacy-evidence');
  const unknown = await base.rentalAgreement.create({ data: { partnerId, assetName: 'Unrecorded legacy units', renter: 'Legacy', bookingStart: date(-120), bookingEnd: date(-60), rentalAmount: 0, status: 'Ongoing' } });
  await assert.rejects(operations.recordRentalUnitMovement(partnerId, unknown.id, movement('unsafe-release', 'Release uncollected', 1)), /cannot be inferred/);
  assert.equal((await rentals.returnAsset(partnerId, unknown.id, 0)).ok, true);
});

test.after(async () => {
  await base.businessRecord.deleteMany({ where: { partnerId } });
  await base.rentalAgreement.deleteMany({ where: { partnerId } });
  await base.rentalAsset.deleteMany({ where: { partnerId } });
  await base.$disconnect();
});
