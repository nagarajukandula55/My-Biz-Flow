const assert = require('node:assert/strict');
const test = require('node:test');
const load = require('./loadModule.cjs');

const plain = v => JSON.parse(JSON.stringify(v));
function loadWith(bom, stock, adjustments = [], created = []) {
  return load('src/lib/invoiceInventory.ts', {
    '@/lib/businessRecords': {
      listBusinessRecords: async (_p, slug) => (slug === 'inventory-bom' ? bom : stock),
      createBusinessRecord: async (_p, slug, data) => { created.push({ slug, data }); return data; },
    },
    '@/lib/inventoryStock': { adjustStockQty: async (...args) => { adjustments.push(args.slice(1)); } },
  });
}
const bom = [{ id: 'MAT-1', serialized: false }, { id: 'MAT-2', serialized: true }];
const stock = [
  { materialId: 'MAT-1 — Screen', warehouseName: 'A', qtyOnHand: 3, availableQty: 3 },
  { materialId: 'MAT-1 — Screen', warehouseName: 'B', qtyOnHand: 5, availableQty: 4, reservedQty: 1 },
  { materialId: 'MAT-1 — Screen', warehouseName: 'A', condition: 'Defective', qtyOnHand: 9 },
  { materialId: 'MAT-2 — Phone', warehouseName: 'A', qtyOnHand: 9 },
];

test('lines without the toggle never touch stock', async () => {
  const m = loadWith(bom, stock);
  assert.equal(m.hasInventoryLines([{ itemId: 'MAT-1', quantity: 2 }]), false);
  const plan = await m.planInvoiceConsumption('p1', [{ itemId: 'MAT-1', quantity: 2 }]);
  assert.deepEqual(plain(plan.allocations), []);
});

test('consumes largest warehouse first, spans warehouses, ignores Defective and reserved', async () => {
  const m = loadWith(bom, stock);
  const plan = await m.planInvoiceConsumption('p1', [{ itemId: 'MAT-1', description: 'Screen', quantity: 6, consumeInventory: true }]);
  assert.equal(plan.error, undefined);
  assert.deepEqual(plain(plan.allocations.map(a => [a.warehouseName, a.qty])), [['B', 4], ['A', 2]]);
  assert.deepEqual(plain(plan.consumedLineIndexes), [0]);
});

test('same material on two lines draws from one pool; shortage is rejected whole', async () => {
  const m = loadWith(bom, stock);
  const lines = [
    { itemId: 'MAT-1', description: 'Screen', quantity: 4, consumeInventory: true },
    { itemId: 'MAT-1', description: 'Screen', quantity: 4, consumeInventory: true },
  ];
  const plan = await m.planInvoiceConsumption('p1', lines);
  assert.match(plan.error, /7 available, 8 needed/);
  assert.deepEqual(plain(plan.allocations), []);
});

test('serialized material and bad quantity are rejected', async () => {
  const m = loadWith(bom, stock);
  assert.match((await m.planInvoiceConsumption('p1', [{ itemId: 'MAT-2', description: 'Phone', quantity: 1, consumeInventory: true }])).error, /serialized/);
  assert.match((await m.planInvoiceConsumption('p1', [{ itemId: 'MAT-1', description: 'Screen', quantity: 0, consumeInventory: true }])).error, /greater than 0/);
});

test('apply deducts stock and logs consumption; finalize strips the flag and stamps consumed lines', async () => {
  const adjustments = [], created = [];
  const m = loadWith(bom, stock, adjustments, created);
  await m.applyInvoiceConsumption('p1', { id: 'r1', number: 'BILL-1', customer: 'Acme' }, [{ materialId: 'MAT-1', materialLabel: 'MAT-1 — Screen', warehouseName: 'B', qty: 4 }]);
  assert.deepEqual(plain(adjustments[0]), ['MAT-1', 'MAT-1 — Screen', 'B', -4]);
  assert.equal(created[0].slug, 'inventory-consumption');
  assert.equal(created[0].data.workorderId, 'BILL-1');
  const out = m.finalizeInvoiceItems([{ consumeInventory: true, itemId: 'MAT-1' }, { consumeInventory: true, inventoryConsumed: true }], [0]);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), [{ itemId: 'MAT-1', inventoryConsumed: true }, {}]);
});
