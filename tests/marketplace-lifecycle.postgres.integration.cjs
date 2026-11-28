const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const load = require('./loadModule.cjs');

const url = 'postgresql://ci:ci@127.0.0.1:55439/ci';
if (process.env.MBF_ISOLATED_TEST !== '1' || process.env.DATABASE_URL !== url) {
  throw new Error('Disposable local CI database required');
}

const { PrismaClient } = require('@prisma/client');
const base = new PrismaClient({ datasources: { db: { url } } });
const db = load('src/lib/databaseTransaction.ts', {
  'node:async_hooks': require('node:async_hooks'),
  '@/lib/databaseClientContext': load('src/lib/databaseClientContext.ts'),
});
const prisma = db.transactionAwareClient(base);
const lock = load('src/lib/withRecordLock.ts', {
  '@/lib/prisma': { prisma },
  '@/lib/databaseTransaction': db,
});
const marketplace = load('src/lib/marketplace.ts', {
  '@/lib/prisma': { prisma },
  '@/lib/withRecordLock': lock,
  '@/lib/tenant': {
    assertModuleAccess: async () => {},
    assertPartnerCanWrite: async () => {},
    assertPartnerScope(partnerId, rowPartnerId) {
      if (partnerId !== rowPartnerId) throw new Error('Partner scope violation');
    },
  },
});

const partnerId = `marketplace-${crypto.randomUUID()}`;

test('Marketplace order transitions preserve stock, prevent replay, reject invalid steps, and serialize competing confirms', async () => {
  const listing = await marketplace.createMarketplaceListing(partnerId, {
    title: 'Synthetic listing',
    price: 1250,
    stockQuantity: 5,
    isActive: true,
  });
  const pending = await marketplace.createMarketplaceOrder(partnerId, {
    listingId: listing.id,
    customerName: 'Synthetic customer',
    quantity: 2,
  });
  assert.ok('order' in pending);
  assert.equal((await marketplace.getMarketplaceListing(partnerId, listing.id)).stockQuantity, 5);

  assert.equal((await marketplace.updateMarketplaceOrderStatus(partnerId, pending.order.id, 'Confirmed')).ok, true);
  assert.equal((await marketplace.getMarketplaceListing(partnerId, listing.id)).stockQuantity, 3);
  assert.equal((await marketplace.updateMarketplaceOrderStatus(partnerId, pending.order.id, 'Confirmed')).ok, true);
  assert.equal((await marketplace.getMarketplaceListing(partnerId, listing.id)).stockQuantity, 3);

  assert.equal((await marketplace.updateMarketplaceOrderStatus(partnerId, pending.order.id, 'Cancelled')).ok, true);
  assert.equal((await marketplace.getMarketplaceListing(partnerId, listing.id)).stockQuantity, 5);
  assert.equal((await marketplace.updateMarketplaceOrderStatus(partnerId, pending.order.id, 'Confirmed')).ok, false);

  const shipping = await marketplace.createMarketplaceOrder(partnerId, {
    listingId: listing.id,
    customerName: 'Second synthetic customer',
    quantity: 1,
  });
  assert.ok('order' in shipping);
  assert.equal((await marketplace.updateMarketplaceOrderStatus(partnerId, shipping.order.id, 'Delivered')).ok, false);
  assert.equal((await marketplace.updateMarketplaceOrderStatus(partnerId, shipping.order.id, 'Confirmed')).ok, true);
  assert.equal((await marketplace.updateMarketplaceOrderStatus(partnerId, shipping.order.id, 'Shipped')).ok, true);
  assert.equal((await marketplace.updateMarketplaceOrderStatus(partnerId, shipping.order.id, 'Cancelled')).ok, false);
  assert.equal((await marketplace.updateMarketplaceOrderStatus(partnerId, shipping.order.id, 'Delivered')).ok, true);
  assert.equal((await marketplace.updateMarketplaceOrderStatus(partnerId, shipping.order.id, 'Delivered')).ok, true);

  const scarce = await marketplace.createMarketplaceListing(partnerId, {
    title: 'Scarce listing',
    price: 100,
    stockQuantity: 3,
    isActive: true,
  });
  const first = await marketplace.createMarketplaceOrder(partnerId, { listingId: scarce.id, customerName: 'First', quantity: 2 });
  const second = await marketplace.createMarketplaceOrder(partnerId, { listingId: scarce.id, customerName: 'Second', quantity: 2 });
  assert.ok('order' in first && 'order' in second);
  const outcomes = await Promise.all([
    marketplace.updateMarketplaceOrderStatus(partnerId, first.order.id, 'Confirmed'),
    marketplace.updateMarketplaceOrderStatus(partnerId, second.order.id, 'Confirmed'),
  ]);
  assert.equal(outcomes.filter((result) => result.ok).length, 1);
  assert.equal((await marketplace.getMarketplaceListing(partnerId, scarce.id)).stockQuantity, 1);
});

test('Marketplace rejects invalid quantities, inactive listings, and cross-tenant order access', async () => {
  const listing = await marketplace.createMarketplaceListing(partnerId, {
    title: 'Restricted listing',
    price: 500,
    stockQuantity: 1,
    isActive: true,
  });
  const invalidQuantity = await marketplace.createMarketplaceOrder(partnerId, {
    listingId: listing.id,
    customerName: 'Synthetic customer',
    quantity: 0,
  });
  assert.equal(invalidQuantity.error, 'Quantity must be a positive whole number.');
  const pending = await marketplace.createMarketplaceOrder(partnerId, {
    listingId: listing.id,
    customerName: 'Synthetic customer',
    quantity: 1,
  });
  assert.ok('order' in pending);
  await assert.rejects(marketplace.updateMarketplaceOrderStatus(`${partnerId}-foreign`, pending.order.id, 'Confirmed'), /Partner scope/);
  await marketplace.updateMarketplaceListing(partnerId, listing.id, { title: listing.title, price: listing.price, stockQuantity: 1, isActive: false });
  const inactiveListing = await marketplace.createMarketplaceOrder(partnerId, {
    listingId: listing.id,
    customerName: 'Another customer',
    quantity: 1,
  });
  assert.equal(inactiveListing.error, 'This listing is not available for ordering.');
});

test.after(async () => {
  await base.marketplaceOrder.deleteMany({ where: { partnerId } });
  await base.marketplaceListing.deleteMany({ where: { partnerId } });
  await base.marketplaceVendor.deleteMany({ where: { partnerId } });
  await base.$disconnect();
});
