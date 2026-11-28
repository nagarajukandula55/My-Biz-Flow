const assert = require('node:assert/strict');
const test = require('node:test');
const crypto = require('node:crypto');
const asyncHooks = require('node:async_hooks');
const load = require('./loadModule.cjs');

const url = process.env.DATABASE_URL;
if (process.env.MBF_ISOLATED_TEST !== '1' || !['postgresql://ci:ci@127.0.0.1:55439/ci', 'postgresql://ci:ci@localhost:5432/ci', 'postgres://ci:ci@localhost:5432/ci'].includes(url)) {
  throw new Error('Disposable local CI database required');
}

const { PrismaClient } = require('@prisma/client');
const base = new PrismaClient({ datasources: { db: { url } } });
const db = load('src/lib/databaseTransaction.ts', {
  'node:async_hooks': asyncHooks,
  '@/lib/databaseClientContext': load('src/lib/databaseClientContext.ts'),
});
const prisma = db.transactionAwareClient(base);
const lock = load('src/lib/withRecordLock.ts', { '@/lib/prisma': { prisma }, '@/lib/databaseTransaction': db });
const partnerId = `wholesale-${crypto.randomUUID()}`;
const data = load('src/lib/wholesaleData.ts', {
  '@/lib/prisma': { prisma },
  '@/lib/tenant': {
    assertModuleAccess: async (_id, slug) => assert.equal(slug, 'wholesale-b2b'),
    assertPartnerCanWrite: async () => {},
    assertPartnerScope: (requestId, rowId) => { if (requestId !== rowId) throw new Error('Partner scope violation'); },
  },
  '@/lib/designer/numbering': { getNextNumber: async (_type, id) => `WSO-${id}-${crypto.randomUUID()}` },
  '@/components/DataTable': {},
  '@/lib/listPagination': load('src/lib/listPagination.ts'),
  '@/lib/wholesaleStatuses':load('src/lib/wholesaleStatuses.ts'),
  '@/lib/withRecordLock': lock,
});

test('Wholesale serializes dealer credit checks and makes referenced payments idempotent', async () => {
  const customer = await base.wholesaleCustomer.create({
    data: { partnerId, name: 'Synthetic dealer', creditLimit: 10000, creditTermDays: 0, isActive: true },
  });
  const product = await base.wholesaleProduct.create({
    data: { partnerId, sku: `SKU-${crypto.randomUUID()}`, name: 'Synthetic item', listPrice: 10000, gstRateBps: 0, minimumQuantity: 1, isActive: true },
  });
  const input = {
    customerId: customer.id,
    orderDate: new Date('2030-01-01T00:00:00.000Z'),
    lines: [{ productId: product.id, quantity: 1, materialId: '', materialLabel: '', unitPrice: 1 }],
  };

  const orders = await Promise.allSettled([
    data.createWholesaleOrder(partnerId, input),
    data.createWholesaleOrder(partnerId, input),
  ]);
  const created = orders.filter((result) => result.status === 'fulfilled').map((result) => result.value);
  assert.equal(created.length, 1);
  assert.match(orders.find((result) => result.status === 'rejected').reason.message, /outstanding balance/);
  assert.equal(await base.wholesaleOrder.count({ where: { partnerId, customerId: customer.id } }), 1);

  const order = await data.getWholesaleOrder(partnerId, created[0].id);
  assert.ok(order);
  const payment = { amount: 5000, method: 'UPI', reference: 'settlement-1' };
  const receipts = await Promise.all([
    data.recordWholesalePayment(partnerId, order.id, payment),
    data.recordWholesalePayment(partnerId, order.id, payment),
  ]);
  assert.equal(receipts.filter((receipt) => receipt.replayed).length, 1);
  assert.equal(new Set(receipts.map((receipt) => receipt.payment.id)).size, 1);
  assert.equal(await base.wholesalePayment.count({ where: { partnerId, orderId: order.id } }), 1);
  await assert.rejects(data.recordWholesalePayment(partnerId, order.id, { ...payment, amount: 5001 }), /different details/);
  await assert.rejects(data.recordWholesalePayment(partnerId, order.id, { amount: 5001, method: 'Cash' }), /remaining order balance/);
  await assert.rejects(data.recordWholesalePayment(`${partnerId}-foreign`, order.id, payment), /Order not found/);

  await data.updateWholesaleOrderStatus(partnerId, order.id, 'Processing');
  await assert.rejects(data.updateWholesaleOrderStatus(partnerId, order.id, 'Shipped'), /Invalid order transition/);
});

test.after(async () => {
  await base.wholesaleOrderEvent.deleteMany({ where: { partnerId } });
  await base.wholesalePayment.deleteMany({ where: { partnerId } });
  await base.wholesaleOrderLine.deleteMany({ where: { order: { partnerId } } });
  await base.wholesaleOrder.deleteMany({ where: { partnerId } });
  await base.wholesaleCustomer.deleteMany({ where: { partnerId } });
  await base.wholesaleProduct.deleteMany({ where: { partnerId } });
  await base.priceTier.deleteMany({ where: { partnerId } });
  await base.$disconnect();
});
