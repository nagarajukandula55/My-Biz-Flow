const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');

test('AMC blocks invalid dates, inactive contract visits, and expired-trial writes', async () => {
  let writes = 0;
  let writable = true;
  const data = load('src/lib/amcContractsData.ts', {
    '@/lib/prisma': { prisma: {
      amcContract: { findUnique: async () => ({ partnerId: 'p1', contractStatus: 'Expired' }), create: async () => { writes++; } },
      serviceVisit: { create: async () => { writes++; } },
    } },
    '@/lib/tenant': {
      assertPartnerScope: (requested, actual) => { if (requested !== actual) throw new Error('wrong tenant'); },
      assertPartnerCanWrite: async () => { if (!writable) throw new Error('trial expired'); },
    },
    '@/lib/recordEntitlement': { assertRecordModuleAccess: async () => {} },
  });
  const input = { customer: 'Customer', equipment: 'AC', contractStartDate: new Date('2027-02-01'), contractEndDate: new Date('2027-01-01') };
  await assert.rejects(data.createAmcContract('p1', input), /Contract end/);
  await assert.rejects(data.createServiceVisit('p1', 'c1', { status: 'Scheduled' }), /active contract/);
  writable = false;
  await assert.rejects(data.createServiceVisit('p1', 'c1', { status: 'Scheduled' }), /trial expired/);
  assert.equal(writes, 0);
});

test('AMC dispatch verifies active technician and renewal locks the complete operation', async () => {
  let updates = 0;
  let lockCalls = 0;
  const contract = {
    partnerId: 'p1', contractStatus: 'Active', customer: 'Customer', equipment: 'AC',
    renewalTermMonths: 1, contractEndDate: new Date('2027-01-31T00:00:00Z'),
    slaHours: 24, contractValue: 12550, serviceVisits: [{ id: 'v1', serviceRequestRaisedAt: new Date(), status: 'Scheduled' }],
  };
  const actions = load('src/app/partner/[partnerId]/amc-field-service/[recordId]/actions.ts', {
    'next/cache': { revalidatePath: () => {} },
    '@/lib/requirePartnerSession': { requireSessionPartnerId: async id => id },
    '@/lib/businessRecords': { getBusinessRecord: async () => undefined },
    '@/lib/amcContractsData': {
      getAmcContract: async () => contract,
      findOpenVisit: value => value.serviceVisits[0],
      updateServiceVisit: async () => { updates++; },
      createAmcContract: async (_partner, values) => {
        assert.equal(values.contractEndDate.toISOString().slice(0, 10), '2027-02-28');
        return { id: 'renewed' };
      },
      updateAmcContract: async (_partner, _id, values) => { Object.assign(contract, values); },
    },
    '@/lib/withRecordLock': { withRecordLock: async (_scope, _id, fn) => { lockCalls++; return fn(); } },
  });
  await assert.rejects(actions.dispatchTechnicianAction('p1', 'c1', 'foreign', 'foreign'), /active technician/);
  assert.equal(updates, 0);
  const result = await actions.renewContractAction('p1', 'c1');
  assert.equal(result.newContractId, 'renewed');
  assert.equal(lockCalls, 1);
  await actions.renewContractAction('p1', 'c1');
  assert.equal(lockCalls, 2);
});

test('AMC form converts rupees to stored paise before creating a contract', async () => {
  let saved;
  const actions = load('src/lib/amcContractActions.ts', {
    'next/cache': { revalidatePath: () => {} },
    'next/navigation': { redirect: () => {} },
    '@/lib/requirePartnerSession': { requireSessionPartnerId: async id => id },
    '@/lib/amcContractsData': { createAmcContract: async (_partner, values) => { saved = values; return { id: 'c1' }; } },
  });
  await actions.createAmcContractAction('p1', {
    customer: 'Customer', equipment: 'AC', contractStartDate: '2027-01-01',
    contractEndDate: '2027-12-31', contractValue: '125.50',
  });
  assert.equal(saved.contractValue, 12550);
});
