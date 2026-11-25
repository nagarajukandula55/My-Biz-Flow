const assert = require('node:assert/strict');
const test = require('node:test');
const load = require('./loadModule.cjs');

const stock = [
  { id: 'S1', materialId: 'MAT-1 - Screen', warehouseName: 'Main', qtyOnHand: 5, reservedQty: 1, availableQty: 0 },
  { id: 'S2', materialId: 'MAT-1 — Screen (legacy)', warehouseName: 'Branch', qtyOnHand: 2, availableQty: 2 },
  { id: 'S3', materialId: 'MAT-1 - Screen', warehouseName: 'Returns', condition: 'Defective', qtyOnHand: 20 },
  { id: 'S4', materialId: 'MAT-2 - Battery', warehouseName: 'Main', availableQty: 3 },
];

const materialLabel = load('src/lib/materialLabel.ts');
const inventoryRead = load('src/lib/inventoryRead.ts', {
  '@/lib/businessRecords': { listBusinessRecords: async () => stock },
  '@/lib/materialLabel': materialLabel,
});

test('availability derives from on-hand minus reservations instead of stale availableQty', () => {
  assert.equal(inventoryRead.availableQtyForStockRow(stock[0]), 4);
  assert.equal(inventoryRead.availableQtyForStockRow(stock[3]), 3);
});

test('material identity accepts standard, en-dash and em-dash legacy labels', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(materialLabel.splitMaterialLabel('MAT-1 - Screen'))), { code: 'MAT-1', name: 'Screen' });
  assert.equal(inventoryRead.materialCode('MAT-1 - Screen'), 'MAT-1');
  assert.equal(inventoryRead.materialCode('MAT-1 – Screen'), 'MAT-1');
  assert.equal(inventoryRead.materialCode('MAT-1 — Screen'), 'MAT-1');
});

test('usable stock spans warehouses and excludes Defective rows', async () => {
  const rows = await inventoryRead.getAvailableStockRows('P1', 'MAT-1');
  assert.deepEqual(Array.from(rows, row => [row.warehouseName, row.available]), [['Main', 4], ['Branch', 2]]);
  const availability = await inventoryRead.getAvailabilityDetailByMaterial('P1');
  assert.equal(availability.get('MAT-1').total, 6);
});
