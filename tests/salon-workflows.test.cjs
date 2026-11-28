const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');

test('Salon currency converts rupees from forms to integer paise and back for display and invoicing', () => {
  const money = load('src/lib/salonSpa/money.ts');
  assert.equal(money.rupeesToSalonPaise('125.50'), 12550);
  assert.equal(money.salonPaiseToRupees(12550), 125.5);
  assert.throws(() => money.rupeesToSalonPaise('-1'), /non-negative/);
  assert.throws(() => money.salonPaiseToRupees(1.5), /stored in paise/);
});

test('Salon service catalog rejects blank names, invalid durations, and negative or fractional paise', async () => {
  let writes = 0;
  const services = load('src/lib/salonSpa/servicesData.ts', {
    '@/lib/prisma': { prisma: { salonService: { create: async ({ data }) => { writes++; return data; }, findUniqueOrThrow: async () => ({ id: 'service-a', partnerId: 'partner-a' }), update: async () => { writes++; } } } },
    '@/lib/tenant': { assertPartnerScope: (requested, actual) => { if (requested !== actual) throw new Error('wrong tenant'); }, assertModuleAccess: async () => {}, assertPartnerCanWrite: async () => {} },
    '@/lib/recordEntitlement': { assertRecordModuleAccess: async () => {} },
  });
  const valid = { name: ' Haircut ', durationMinutes: 30, price: 12500 };
  const result = await services.createSalonService('partner-a', valid);
  assert.equal(result.name, 'Haircut');
  for (const invalid of [{ ...valid, name: ' ' }, { ...valid, durationMinutes: 0 }, { ...valid, durationMinutes: 1441 }, { ...valid, price: -1 }, { ...valid, price: 1.5 }]) {
    await assert.rejects(services.createSalonService('partner-a', invalid));
  }
  assert.equal(writes, 1);
});

test('Salon completion invoice passes rupee values and an itemized taxable service into Billing', async () => {
  let invoiceInput;
  let invoiceId = null;
  const action = load('src/app/partner/[partnerId]/salon-spa/[recordId]/actions.ts', {
    'next/cache': { revalidatePath: () => {} },
    'next/navigation': { redirect: () => {} },
    '@/lib/businessRecords': { createBusinessRecord: async (_partner, _module, data) => { invoiceInput = data; return { id: 'inv-a' }; } },
    '@/lib/requirePartnerSession': { requireSessionPartnerId: async partner => partner },
    '@/lib/salonSpa/appointmentsData': {
      createSalonAppointment: async () => ({}), updateSalonAppointment: async () => {}, completeSalonAppointment: async () => ({}),
      getSalonAppointment: async () => ({ id: 'appt-a', status: 'Completed', invoiceId, customer: 'Customer', serviceName: 'Haircut', stylist: 'Taylor', price: 5000 }),
      SalonScheduleConflictError: class SalonScheduleConflictError extends Error {},
      setSalonAppointmentInvoiceId: async (_partner, _id, value) => { invoiceId = value; },
    },
    '@/lib/withRecordLock': { withRecordLock: async (_scope, _key, work) => work() },
    '@/lib/salonSpa/money': load('src/lib/salonSpa/money.ts'),
  });
  await action.createInvoiceFromBookingAction('partner-a', 'appt-a');
  assert.equal(invoiceInput.subtotal, 50);
  assert.equal(invoiceInput.taxAmount, 9);
  assert.equal(invoiceInput.totalAmount, 59);
  assert.deepEqual(JSON.parse(JSON.stringify(invoiceInput.items)), [{ description: 'Haircut', quantity: 1, unit: 'service', unitPrice: 50, taxRate: 18 }]);
  await action.createInvoiceFromBookingAction('partner-a', 'appt-a');
  assert.equal(invoiceId, 'inv-a');
});

function setupSalon() {
  const appointments = [];
  const locks = new Map();
  const prisma = {
    salonService: {
      findFirst: async ({ where }) => where.id === 'service-a' && where.partnerId === 'partner-a' && where.isActive
        ? { id: 'service-a', partnerId: 'partner-a', name: 'Cut', durationMinutes: 60, price: 2500, isActive: true }
        : null,
    },
    salonAppointment: {
      findMany: async ({ where }) => appointments.filter(row => row.partnerId === where.partnerId &&
        !where.status.notIn.includes(row.status) && row.appointmentDate >= where.appointmentDate.gte &&
        row.appointmentDate < where.appointmentDate.lt && (!where.id?.not || row.id !== where.id.not)),
      create: async ({ data }) => {
        const row = { id: `appointment-${appointments.length + 1}`, ...data, status: 'Booked' };
        appointments.push(row);
        return row;
      },
      findFirst: async ({ where }) => appointments.find(row => row.id === where.id && row.partnerId === where.partnerId) ?? null,
      update: async ({ where, data }) => {
        const row = appointments.find(candidate => candidate.id === where.id);
        Object.assign(row, data);
        return row;
      },
    },
  };
  const salon = load('src/lib/salonSpa/appointmentsData.ts', {
    '@/lib/prisma': { prisma },
    '@/lib/tenant': { assertPartnerScope: (requested, actual) => { if (requested !== actual) throw new Error('wrong tenant'); }, assertModuleAccess: async () => {}, assertPartnerCanWrite: async () => {} },
    '@/lib/recordEntitlement': { assertRecordModuleAccess: async () => {} },
    '@/lib/withRecordLock': {
      withRecordLock: async (scope, id, work) => {
        const key = `${scope}:${id}`;
        const previous = locks.get(key) ?? Promise.resolve();
        let release;
        const gate = new Promise(resolve => { release = resolve; });
        locks.set(key, previous.then(() => gate));
        await previous;
        try { return await work(); } finally { release(); }
      },
    },
  });
  return { salon, appointments };
}

const booking = (stylist = 'Taylor', time = '2026-11-27T10:00:00.000Z') => ({
  customer: 'Customer A', serviceId: 'service-a', stylist,
  appointmentDate: new Date(time), commissionPercent: 10,
});

test('concurrent Salon bookings for one stylist serialize and the later overlapping request is rejected', async () => {
  const { salon, appointments } = setupSalon();
  const results = await Promise.allSettled([
    salon.createSalonAppointment('partner-a', booking()),
    salon.createSalonAppointment('partner-a', booking('taylor', '2026-11-27T10:30:00.000Z')),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const rejected = results.find(result => result.status === 'rejected');
  assert.ok(rejected.reason instanceof salon.SalonScheduleConflictError);
  assert.equal(appointments.length, 1);
});

test('Salon appointment creation rejects invalid data and inactive or cross-business services without writes', async () => {
  const { salon, appointments } = setupSalon();
  await assert.rejects(salon.createSalonAppointment('partner-a', { ...booking(), customer: ' ' }), /Customer name is required/);
  await assert.rejects(salon.createSalonAppointment('partner-a', { ...booking(), stylist: ' ' }), /Stylist \/ therapist is required/);
  await assert.rejects(salon.createSalonAppointment('partner-a', { ...booking(), appointmentDate: new Date('invalid') }), /valid appointment/);
  await assert.rejects(salon.createSalonAppointment('partner-a', { ...booking(), serviceId: 'foreign-service' }), /active service belonging to this business/);
  assert.equal(appointments.length, 0);
});

test('Salon rescheduling rejects invalid statuses and completion cannot be undone', async () => {
  const { salon } = setupSalon();
  const created = await salon.createSalonAppointment('partner-a', booking());
  await assert.rejects(salon.updateSalonAppointment('partner-a', created.id, { ...booking(), status: 'Mystery' }), /valid appointment status/);
  const completed = await salon.completeSalonAppointment('partner-a', created.id);
  assert.equal(completed.status, 'Completed');
  assert.equal(completed.commissionAmount, 250);
  await assert.rejects(salon.updateSalonAppointment('partner-a', created.id, { ...booking(), status: 'Booked' }), /cannot be reopened/);
  await assert.rejects(salon.completeSalonAppointment('partner-a', 'missing'), /Appointment not found/);
});

test('Salon rejects disabled module and expired trial before appointment or service writes', async () => {
  let writes = 0;
  let enabled = false;
  let writable = true;
  const tenant = {
    assertPartnerScope: () => {},
    assertPartnerCanWrite: async () => { if (!writable) throw new Error('trial expired'); },
  };
  const appointments = load('src/lib/salonSpa/appointmentsData.ts', {
    '@/lib/prisma': { prisma: { salonAppointment: { findFirst: async () => ({ id: 'a', partnerId: 'p', price: 100 }), update: async () => { writes++; } } } },
    '@/lib/tenant': tenant,
    '@/lib/recordEntitlement': { assertRecordModuleAccess: async () => { if (!enabled) throw new Error('module disabled'); } },
    '@/lib/withRecordLock': { withRecordLock: async (_scope, _id, fn) => fn() },
  });
  const services = load('src/lib/salonSpa/servicesData.ts', {
    '@/lib/prisma': { prisma: { salonService: { create: async () => { writes++; } } } },
    '@/lib/tenant': tenant,
    '@/lib/recordEntitlement': { assertRecordModuleAccess: async () => { if (!enabled) throw new Error('module disabled'); } },
  });
  await assert.rejects(appointments.completeSalonAppointment('p', 'a'), /module disabled/);
  enabled = true;
  writable = false;
  await assert.rejects(appointments.completeSalonAppointment('p', 'a'), /trial expired/);
  await assert.rejects(services.createSalonService('p', { name: 'Cut', durationMinutes: 30, price: 100 }), /trial expired/);
  assert.equal(writes, 0);
});
