const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');

const wholesale = load('src/lib/wholesaleData.ts', {
  '@/lib/prisma': { prisma: {} },
  '@/lib/tenant': { assertPartnerScope: () => {} },
  '@/lib/designer/numbering': { getNextNumber: async () => 'WSO-1' },
  '@/lib/withRecordLock': { withRecordLock: async (_scope, _id, work) => work() },
  '@/components/DataTable': {},
  '@/lib/listPagination': load('src/lib/listPagination.ts'),
  '@/lib/wholesaleStatuses':load('src/lib/wholesaleStatuses.ts'),
});
const inventory = load('src/lib/inventoryRead.ts', {
  '@/lib/businessRecords': {}, '@/components/DataTable': {},
});

test('wholesale PO lifecycle permits only the next practical step', () => {
  const allowed = [
    ['Requested','Processing'], ['Processing','Picking'], ['Picking','Packed'],
    ['Packed','Shipped'], ['Shipped','Delivered'], ['Delivered','Received'],
  ];
  for (const [from,to] of allowed) assert.equal(wholesale.isAllowedStatusTransition(from,to), true);
  for (const [from,to] of [['Requested','Shipped'],['Processing','Packed'],['Picking','Delivered'],['Received','Requested'],['Shipped','Cancelled']]) {
    assert.equal(wholesale.isAllowedStatusTransition(from,to), false);
  }
  for (const status of ['Requested','Processing','Picking','Packed']) assert.equal(wholesale.isAllowedStatusTransition(status,'Cancelled'), true);
});

test('serialized quantities require one unique serial or barcode per unit', () => {
  assert.equal(inventory.validateSerialNumbers(['A','B'],2,'Phone'), null);
  assert.match(inventory.validateSerialNumbers(['A'],2,'Phone'), /exactly 2/);
  assert.match(inventory.validateSerialNumbers(['A','A'],2,'Phone'), /Duplicate/);
});

test('allocated pricing applies tier discount and GST deterministically', () => {
  const result = wholesale.calculateWholesaleOrder([{ materialId:'P', materialLabel:'P', quantity:2, unitPrice:10000, gstRateBps:1800 }], 10);
  assert.equal(result.subtotalAmount,18000);
  assert.equal(result.taxAmount,3240);
  assert.equal(result.totalAmount,21240);
});
