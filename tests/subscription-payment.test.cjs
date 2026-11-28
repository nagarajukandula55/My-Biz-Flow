const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');

test('membership payment preserves paise and a stale repeated request cannot issue another invoice', async () => {
  const subscriber = {
    id: 's1', partnerId: 'p1', status: 'Active', memberName: 'Member',
    billingCycle: 'Monthly', planAmount: 12550, nextBillingDate: new Date('2026-12-01T00:00:00Z'), invoiceIds: [],
  };
  const invoices = [];
  let chain = Promise.resolve();
  const module = load('src/lib/subscriptions.ts', {
    '@/lib/prisma': { prisma: { subscriber: {
      findFirst: async ({ where }) => where.partnerId === subscriber.partnerId && where.id === subscriber.id ? { ...subscriber } : null,
      update: async ({ data }) => Object.assign(subscriber, data),
    } } },
    '@/lib/businessRecords': { createBusinessRecord: async (_partner, slug, values) => {
      assert.equal(slug, 'billing');
      invoices.push(values);
      return { id: `invoice-${invoices.length}` };
    } },
    '@/lib/tenant': { assertPartnerCanWrite: async () => {} },
    '@/lib/recordEntitlement': { assertRecordModuleAccess: async () => {} },
    '@/lib/withRecordLock': { withRecordLock: async (_scope, _key, work) => {
      const previous = chain;
      let release;
      chain = new Promise(resolve => { release = resolve; });
      await previous;
      try { return await work(); } finally { release(); }
    } },
  });
  assert.equal(module.addMonths(new Date('2027-01-31T00:00:00Z'), 1).toISOString().slice(0, 10), '2027-02-28');
  const results = await Promise.allSettled([
    module.recordSubscriberPayment('p1', 's1', '2026-12-01', 'UPI'),
    module.recordSubscriberPayment('p1', 's1', '2026-12-01', 'UPI'),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(invoices.length, 1);
  assert.equal(invoices[0].totalAmount, 125.5);
  assert.equal(invoices[0].paymentMode, 'UPI');
  assert.equal(invoices[0].sourceBillingCycleDate, '2026-12-01');
  assert.deepEqual(Array.from(subscriber.invoiceIds), ['invoice-1']);
  assert.equal(subscriber.nextBillingDate.toISOString().slice(0, 10), '2027-01-01');
  await assert.rejects(module.recordSubscriberPayment('p1', 's1', '2027-01-01', 'Auto-charge'), /payment method/);
  await assert.rejects(module.recordSubscriberPayment('p2', 's1', '2027-01-01', 'Cash'), /Membership not found/);
  assert.equal(invoices.length, 1);
});

test('membership creation rejects a foreign plan and malformed amount before writes', async () => {
  let writes = 0;
  const module = load('src/lib/subscriptions.ts', {
    '@/lib/prisma': { prisma: {
      subscriptionPlan: { findFirst: async () => null },
      subscriber: { create: async () => { writes++; } },
    } },
    '@/lib/businessRecords': { createBusinessRecord: async () => {} },
    '@/lib/tenant': { assertPartnerCanWrite: async () => {} },
    '@/lib/recordEntitlement': { assertRecordModuleAccess: async () => {} },
    '@/lib/withRecordLock': { withRecordLock: async () => {} },
  });
  const input = { memberName: 'Member', planId: 'foreign', billingCycle: 'Monthly', planAmount: 12345 };
  await assert.rejects(module.createSubscriber('p1', input), /belonging to this business/);
  await assert.rejects(module.createSubscriber('p1', { ...input, planId: null, planAmount: 12.5 }), /non-negative amount in paise/);
  await assert.rejects(module.createSubscriber('p1', { ...input, planId: null, billingCycle: 'Other' }), /valid billing cycle/);
  assert.equal(writes, 0);
});
