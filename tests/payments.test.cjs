const assert = require('node:assert/strict');
const test = require('node:test');
const load = require('./loadModule.cjs');
const policy = load('src/lib/subscriptionPaymentPolicy.ts');
const payment = { id: 'pay_123', order_id: 'order_123', amount: 120000, currency: 'INR', status: 'captured', captured: true, amount_refunded: 0 };
const order = { id: 'order_123', amount: 120000, amount_paid: 120000, amount_due: 0, currency: 'INR', status: 'paid', notes: { partnerId: 'SC0001', planId: 'plan1', billingCycle: 'Yearly', offerId: '' } };

test('payment binding rejects wrong owner, uncaptured, refunded and mismatched amounts', () => {
  assert.equal(policy.validateCapturedSubscriptionPayment(payment, order, 'SC0001').amount, 1200);
  assert.throws(() => policy.validateCapturedSubscriptionPayment(payment, order, 'SC0002'));
  for (const patch of [{ status: 'authorized' }, { captured: false }, { amount_refunded: 100 }, { currency: 'USD' }, { amount: 1200 }, { order_id: 'order_other' }]) {
    assert.throws(() => policy.validateCapturedSubscriptionPayment({ ...payment, ...patch }, order));
  }
  assert.throws(() => policy.validateCapturedSubscriptionPayment(payment, { ...order, notes: {} }));
  assert.throws(() => policy.validateCapturedSubscriptionPayment(payment, { ...order, status: 'created' }));
});

test('payment acceptance persists before activation, does not reactivate replay, and rejects changed plans', async () => {
  let existing = null;
  let planId = 'plan1';
  let failInsert = false;
  const events = [];
  const tx = {
    $queryRaw: async () => { events.push('lock'); return []; },
    subscriptionPayment: {
      findUnique: async () => existing,
      create: async ({ data }) => { events.push('insert'); if (failInsert) throw new Error('database failure'); existing = data; },
    },
    partner: {
      findUnique: async () => ({ planId, billingCycle: 'Yearly', offerId: null }),
      update: async () => events.push('activate'),
    },
  };
  const service = load('src/lib/acceptSubscriptionPayment.ts', {
    '@/lib/prisma': { prisma: { $transaction: async fn => fn(tx) } },
    '@/lib/razorpay': { fetchPaymentAndOrder: async () => ({ payment, order }) },
    '@/lib/subscriptionPaymentPolicy': policy,
    '@/lib/paymentDeliveryQueue': { enqueuePaymentDelivery: async () => events.push('enqueue') },
  });
  assert.equal((await service.acceptSubscriptionPayment('pay_123', 'order_123', 'SC0001')).newlyRecorded, true);
  assert.deepEqual(events, ['lock', 'insert', 'enqueue', 'activate']);
  events.length = 0;
  planId = 'changed-plan';
  assert.equal((await service.acceptSubscriptionPayment('pay_123')).newlyRecorded, false);
  assert.deepEqual(events, ['lock']);
  existing = null;
  await assert.rejects(service.acceptSubscriptionPayment('pay_123'), /selection changed/);
  planId = 'plan1'; failInsert = true; events.length = 0;
  await assert.rejects(service.acceptSubscriptionPayment('pay_123'), /database failure/);
  assert.deepEqual(events, ['lock', 'insert']);
});

test('partner home skips revoked and unknown modules', async () => {
  let entitlements = ['billing', 'unknown'];
  const home = load('src/lib/partnerHome.ts', {
    '@/lib/designer/partnerTypesData': { getPartnerType: async () => ({ defaultModules: ['service-centre', 'unknown', 'billing'] }) },
    '@/lib/designer/accessKeys': { getPartnerEntitlements: async () => entitlements },
    '@/lib/designer/modules': { getModule: slug => ['billing', 'service-centre'].includes(slug) ? { slug } : undefined },
  });
  assert.equal(await home.getPartnerHomePath({ id: 'SC0001' }), '/partner/SC0001/billing');
  entitlements = [];
  assert.equal(await home.getPartnerHomePath({ id: 'SC0001' }), '/partner/SC0001/dashboard');
});
