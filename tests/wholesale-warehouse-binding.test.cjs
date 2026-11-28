const assert = require('node:assert/strict');
const test = require('node:test');
const load = require('./loadModule.cjs');

const partnerId = 'distributor-test';
let stockReads = 0;
let reserved = [];
let savedOrder;
let moduleEnabled = true;
let writesAllowed = true;
let orderReads = 0;
const order = {
  id: 'order-1', partnerId, status: 'Processing', priceTier: null,
  lines: [{ id: 'line-1', quantity: 2, unitPrice: 10000, gstRateBps: 0, materialLabel: 'MAT - Material', product: { inventoryMaterialId: 'MAT', serialized: false } }],
};
const prisma = {
  wholesaleOrder: {
    findFirst: async () => { orderReads++; return order; },
    update: async ({ data }) => { savedOrder = data; },
  },
  wholesaleOrderLine: { update: async () => {} },
  wholesaleOrderEvent: { create: async () => {} },
};
const fulfillment = load('src/lib/wholesaleFulfillment.ts', {
  '@/lib/prisma': { prisma },
  '@/lib/withRecordLock': { withRecordLock: async (_scope, _id, work) => work() },
  '@/lib/inventoryStock': {
    findStockRecord: async () => { stockReads++; return { availableQty: 5 }; },
    adjustReservedQty: async (...args) => { reserved.push(args); },
    adjustStockQty: async () => {},
    parseSerialNumbers: () => [],
    validateSerialNumbers: () => null,
  },
  '@/lib/stockLots': { consumeFifo: async () => {}, consumeSerializedUnits: async () => {}, createStockLots: async () => {} },
  '@/lib/businessRecords': {
    getBusinessRecord: async (_partnerId, slug, id) => slug === 'inventory-warehouses' && id === 'warehouse-1'
      ? { id, name: 'Main Warehouse', status: 'Active' }
      : null,
    createBusinessRecord: async () => {},
  },
  '@/lib/wholesaleData': { discountedUnitPrice: (price) => price },
  '@/lib/tenant': {
    assertModuleAccess: async (_id, slug) => { assert.equal(slug, 'wholesale-b2b'); if (!moduleEnabled) throw Error('Module disabled'); },
    assertPartnerCanWrite: async () => { if (!writesAllowed) throw Error('Trial expired'); },
  },
});

test('Wholesale allocation binds warehouse ID to the active saved name before reading or reserving stock', async () => {
  const lines = [{ lineId: 'line-1', quantity: 2 }];
  moduleEnabled = false;
  await assert.rejects(
    fulfillment.allocateWholesaleStock(partnerId, 'order-1', { warehouseId: 'warehouse-1', warehouseName: 'Main Warehouse', lines }, { type: 'Distributor' }),
    /Module disabled/,
  );
  moduleEnabled = true;
  writesAllowed = false;
  await assert.rejects(
    fulfillment.allocateWholesaleStock(partnerId, 'order-1', { warehouseId: 'warehouse-1', warehouseName: 'Main Warehouse', lines }, { type: 'Distributor' }),
    /Trial expired/,
  );
  writesAllowed = true;
  assert.equal(orderReads, 0);
  await assert.rejects(
    fulfillment.allocateWholesaleStock(partnerId, 'order-1', { warehouseId: 'foreign-id', warehouseName: 'Main Warehouse', lines }, { type: 'Distributor' }),
    /missing or inactive/,
  );
  await assert.rejects(
    fulfillment.allocateWholesaleStock(partnerId, 'order-1', { warehouseId: 'warehouse-1', warehouseName: 'Other Warehouse', lines }, { type: 'Distributor' }),
    /does not match its saved record/,
  );
  assert.equal(stockReads, 0);
  assert.equal(reserved.length, 0);

  await fulfillment.allocateWholesaleStock(partnerId, 'order-1', { warehouseId: 'warehouse-1', warehouseName: 'Main Warehouse', lines }, { type: 'Distributor' });
  assert.equal(stockReads, 1);
  assert.equal(reserved.length, 1);
  assert.equal(reserved[0][3], 'Main Warehouse');
  assert.equal(savedOrder.warehouseId, 'warehouse-1');
  assert.equal(savedOrder.warehouseName, 'Main Warehouse');
});
