const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');

function setup() {
  const created = [];
  const prisma = {
    driver: { findFirst: async ({ where }) => where.id === 'driver-a' && where.partnerId === 'partner-a' && where.isActive ? { id: 'driver-a', name: 'A Driver' } : null },
    vehicle: { findFirst: async ({ where }) => where.id === 'vehicle-a' && where.partnerId === 'partner-a' && where.isActive ? { id: 'vehicle-a' } : null },
    trip: {
      create: async ({ data }) => { created.push(data); return data; },
      findUnique: async () => ({ id: 'trip-a', partnerId: 'partner-a', driverName: 'Old Driver', vehicleId: null }),
      update: async ({ data }) => data,
    },
  };
  return { fleet: load('src/lib/logisticsFleet.ts', { '@/lib/prisma': { prisma }, '@/lib/tenant': { assertPartnerCanWrite: async () => {} }, '@/lib/recordEntitlement': { assertRecordModuleAccess: async () => {} }, '@/lib/withRecordLock': { withRecordLock: async (_scope, _key, fn) => fn() }, '@/lib/logisticsFleetShared':load('src/lib/logisticsFleetShared.ts') }), created };
}

test('Logistics Fleet refuses cross-tenant and inactive driver or vehicle references before creating trips', async () => {
  const { fleet, created } = setup();
  const base = { origin: 'A', destination: 'B' };
  await assert.rejects(fleet.createTrip('partner-a', { ...base, driverId: 'foreign-driver' }), /active driver belonging/);
  await assert.rejects(fleet.createTrip('partner-a', { ...base, vehicleId: 'foreign-vehicle' }), /active vehicle belonging/);
  assert.equal(created.length, 0);
  await fleet.createTrip('partner-a', { ...base, driverId: 'driver-a', vehicleId: 'vehicle-a' });
  assert.equal(created[0].driverName, 'A Driver');
});

test('Logistics Fleet assignment derives driver identity from the same-tenant active record', async () => {
  const { fleet } = setup();
  await assert.rejects(fleet.assignTripDriverVehicle('partner-a', 'trip-a', 'foreign-driver', 'Forged Name'), /active driver belonging/);
  const assignment = await fleet.assignTripDriverVehicle('partner-a', 'trip-a', 'driver-a', 'Forged Name', 'vehicle-a');
  assert.equal(assignment, undefined);
});

test('Logistics Fleet refuses invalid delivery jumps and missing proof before writes', async () => {
  const trip = { id: 'trip-a', partnerId: 'partner-a', deliveryStage: 'Pending' };
  let updates = 0;
  let enabled = true;
  const fleet = load('src/lib/logisticsFleet.ts', {
    '@/lib/prisma': { prisma: { trip: {
      findUnique: async () => trip,
      update: async ({ data }) => { updates++; Object.assign(trip, data); },
    } } },
    '@/lib/tenant': { assertPartnerCanWrite: async () => {} },
    '@/lib/recordEntitlement': { assertRecordModuleAccess: async () => { if (!enabled) throw new Error('module disabled'); } },
    '@/lib/withRecordLock': { withRecordLock: async (_scope, _key, fn) => fn() },
    '@/lib/logisticsFleetShared':load('src/lib/logisticsFleetShared.ts'),
  });
  await assert.rejects(fleet.advanceTripDeliveryStage('partner-a', 'trip-a', 'Delivered', { recipientName: 'A', deliveryNotes: 'Proof' }), /Invalid delivery stage transition/);
  enabled = false;
  await assert.rejects(fleet.advanceTripDeliveryStage('partner-a', 'trip-a', 'Out for Delivery'), /module disabled/);
  enabled = true;
  await fleet.advanceTripDeliveryStage('partner-a', 'trip-a', 'Out for Delivery');
  await assert.rejects(fleet.advanceTripDeliveryStage('partner-a', 'trip-a', 'Delivered', { recipientName: '', deliveryNotes: '' }), /delivery proof/);
  await fleet.advanceTripDeliveryStage('partner-a', 'trip-a', 'Delivered', { recipientName: 'A', deliveryNotes: 'Signed' });
  await assert.rejects(fleet.advanceTripDeliveryStage('partner-a', 'trip-a', 'Pending'), /Invalid delivery stage transition/);
  assert.equal(updates, 2);
});
