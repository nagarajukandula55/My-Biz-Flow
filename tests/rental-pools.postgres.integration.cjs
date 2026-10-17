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
const policy = load('src/lib/rentalAssetPolicy.ts');
const terms = load('src/lib/rentalTerms.ts');
const common = { '@/lib/prisma': { prisma }, '@/lib/withRecordLock': locks, '@/lib/tenant': { assertModuleAccess: async () => {}, assertPartnerCanWrite: async () => {} } };
const rentals = load('src/lib/rentals.ts', { ...common, '@/lib/rentalFulfillment': load('src/lib/rentalFulfillment.ts'), '@/lib/rentalAssetPolicy': policy, '@/lib/rentalTerms': terms, '@/lib/bookingValidation': load('src/lib/bookingValidation.ts'), '@/lib/rentalRules': load('src/lib/rentalRules.ts', { '@/lib/format': load('src/lib/format.ts') }) });
const payments = load('src/lib/rentalPayments.ts', { ...common, '@/lib/rentalSettlement': load('src/lib/rentalSettlement.ts'), '@/lib/requirePartnerSession': { requireSessionPartnerId: async () => {} } });
const partnerId = 'rental-pool-' + crypto.randomUUID();
const start = new Date('2035-01-01T09:00:00Z'), end = new Date('2035-01-01T10:00:00Z');
const input = asset => ({ assetId: asset.id, assetName: asset.assetName, renter: 'Synthetic pool renter', bookingStart: start, bookingEnd: end, rentalAmount: 10000, depositAmount: 10000, status: 'Confirmed', terms: terms.readRentalTerms({ quantity: 2 }) });

test('rental pooled reservations serialize competing requests and guard stock reductions, maintenance and financial quantities', async () => {
  const asset = await rentals.createAsset(partnerId, { assetName: 'Chairs pool', policy: policy.readRentalAssetPolicy({ stockQuantity: 3, turnaroundMinutes: 60 }) });
  const request = input(asset);
  const attempts = await Promise.all([rentals.createAgreement(partnerId, request), rentals.createAgreement(partnerId, request)]);
  assert.equal(attempts.filter(result => result.ok).length, 1);
  const booking = attempts.find(result => result.ok);
  assert.equal((await rentals.getAgreement(partnerId, booking.id)).terms.quantity, 2);
  await assert.rejects(rentals.updateAsset(partnerId, asset.id, { assetName: asset.assetName, policy: policy.readRentalAssetPolicy({ stockQuantity: 1 }) }), /capacity/);
  const duringPreparation = { ...request, bookingStart: new Date('2035-01-01T10:30:00Z'), bookingEnd: new Date('2035-01-01T11:00:00Z') };
  assert.equal((await rentals.createAgreement(partnerId, duringPreparation)).ok, false);
  assert.equal((await rentals.createAgreement(partnerId, { ...duringPreparation, bookingStart: new Date('2035-01-01T11:00:00Z'), bookingEnd: new Date('2035-01-01T12:00:00Z') })).ok, true);
  await assert.rejects(rentals.scheduleMaintenance(partnerId, asset.id, { maintenanceStart: start.toISOString(), maintenanceEnd: end.toISOString() }), /overlaps/);
  await rentals.updateAsset(partnerId, asset.id, { assetName: asset.assetName, policy: policy.readRentalAssetPolicy({ stockQuantity: 4, turnaroundMinutes: 60 }) });
  assert.equal((await rentals.createAgreement(partnerId, request)).ok, true);
  await payments.recordRentalPayment(partnerId, booking.id, { paymentKind: 'Deposit receipt', paymentAmount: '100', paymentReference: 'pool-deposit' });
  await assert.rejects(rentals.updateAgreement(partnerId, booking.id, { ...request, terms: terms.readRentalTerms({ quantity: 1 }) }), /retain their quantity/);
  await assert.rejects(rentals.createAgreement(partnerId + '-foreign', request), /Asset not found/);
  assert.equal((await rentals.listAgreements(partnerId)).find(item => item.id === booking.id).quantity, 2);
  assert.equal((await rentals.getAsset(partnerId, asset.id)).agreements.find(item => item.id === booking.id).quantity, 2);
});

test('rental pool overdue units remain reserved until returned and full-pool maintenance blocks any quantity', async () => {
  const asset = await rentals.createAsset(partnerId, { assetName: 'Overdue pool', policy: policy.readRentalAssetPolicy({ stockQuantity: 3 }) });
  const request = input(asset);
  const late = await rentals.createAgreement(partnerId, { ...request, bookingStart: new Date('2020-01-01T09:00:00Z'), bookingEnd: new Date('2020-01-01T10:00:00Z'), status: 'Ongoing' });
  assert.equal((await rentals.createAgreement(partnerId, request)).ok, false);
  assert.equal((await rentals.createAgreement(partnerId, { ...request, terms: terms.readRentalTerms({ quantity: 1 }) })).ok, true);
  await assert.rejects(rentals.scheduleMaintenance(partnerId, asset.id, { maintenanceStart: '2036-01-01T09:00:00Z', maintenanceEnd: '2036-01-01T10:00:00Z' }), /Overdue/);
  await rentals.returnAsset(partnerId, late.id, 0);
  assert.equal((await rentals.createAgreement(partnerId, request)).ok, true);
  await rentals.scheduleMaintenance(partnerId, asset.id, { maintenanceStart: '2036-01-01T09:00:00Z', maintenanceEnd: '2036-01-01T10:00:00Z' });
  await assert.rejects(rentals.createAgreement(partnerId, { ...request, bookingStart: new Date('2036-01-01T09:00:00Z'), bookingEnd: new Date('2036-01-01T10:00:00Z'), terms: terms.readRentalTerms({ quantity: 1 }) }), /maintenance/);
});

test('rental pools protect legacy single units, persist unit rates and roll back unavailable batch lines', async () => {
  const asset = await rentals.createAsset(partnerId, { assetName: 'Legacy singleton' });
  await assert.rejects(rentals.createAgreement(partnerId, input(asset)), /exceeds/);
  const legacy = await rentals.createAgreement(partnerId, { ...input(asset), terms: undefined });
  assert.equal(legacy.ok, true);
  assert.equal((await rentals.createAgreement(partnerId, { ...input(asset), terms: terms.readRentalTerms({ quantity: 1 }) })).ok, false);
  const pool = await rentals.createAsset(partnerId, { assetName: 'Price pool', policy: policy.readRentalAssetPolicy({ stockQuantity: 5 }) });
  const priced = await rentals.createAgreement(partnerId, { ...input(pool), terms: terms.readRentalTerms({ quantity: 3, rateUnit: 'Hourly', rateRupees: '10' }) });
  assert.equal((await rentals.getAgreement(partnerId, priced.id)).rentalAmount, 3000);
  const before = await base.rentalAgreement.count({ where: { partnerId } });
  await assert.rejects(rentals.createAgreementBatch(partnerId, [input(pool), { ...input(asset), terms: terms.readRentalTerms({ quantity: 1 }) }]), /unavailable/);
  assert.equal(await base.rentalAgreement.count({ where: { partnerId } }), before);
});

test.after(async () => {
  await base.businessRecord.deleteMany({ where: { partnerId } });
  await base.rentalAgreement.deleteMany({ where: { partnerId } });
  await base.rentalAsset.deleteMany({ where: { partnerId } });
  await base.$disconnect();
});
