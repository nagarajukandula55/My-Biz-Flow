const assert = require('node:assert/strict');
const test = require('node:test');
const load = require('./loadModule.cjs');

test('billing export uses issued invoice and linked workorder numbers, never internal keys', () => {
  const { prepareBillingExportRows } = load('src/lib/billingExportRows.ts');
  const [row] = prepareBillingExportRows([{
    id: 'BIL-REC-9F42',
    invoiceNumber: 'GST-26-27-0042',
    sourceWorkorderId: 'WO202611220001',
  }]);
  assert.equal(row.invoiceNumber, 'GST-26-27-0042');
  assert.equal(row.workorderNumber, 'WO202611220001');
  assert.equal(Object.hasOwn(row, 'sourceWorkorderId'), false);
});

test('billing export preserves historical invoice keys when no issued number was stored', () => {
  const { prepareBillingExportRows } = load('src/lib/billingExportRows.ts');
  const [row] = prepareBillingExportRows([{ id: 'INV-OLD-0007' }]);
  assert.equal(row.invoiceNumber, 'INV-OLD-0007');
  assert.equal(row.workorderNumber, '');
});
