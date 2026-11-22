const assert = require('node:assert/strict');
const test = require('node:test');
const load = require('./loadModule.cjs');

test('consumption display uses business references and current BOM names', () => {
  const { prepareConsumptionDisplayRows } = load('src/lib/consumptionDisplayRows.ts', {
    '@/lib/materialLabel': { splitMaterialLabel: value => {
      const raw = String(value ?? ''); const index = raw.indexOf(' - ');
      return index < 0 ? { code: raw.trim(), name: '' } : { code: raw.slice(0, index).trim(), name: raw.slice(index + 3).trim() };
    } },
  });
  const rows = prepareConsumptionDisplayRows([
    { id: 'CNS-INTERNAL-1', workorderId: 'WO202611220001', materialId: 'MAT-01', materialLabel: 'MAT-01 - Old name' },
    { id: 'CNS-INTERNAL-2', source: 'Sales Invoice', workorderId: 'GST-26-27-0042', materialId: 'MAT-01', materialLabel: 'MAT-01 - Old name' },
  ], [{ id: 'MAT-01', description: 'Updated display assembly' }]);

  assert.equal(rows[0].workorderNumber, 'WO202611220001');
  assert.equal(rows[0].invoiceNumber, '');
  assert.equal(rows[1].workorderNumber, '');
  assert.equal(rows[1].invoiceNumber, 'GST-26-27-0042');
  assert.equal(rows[0].materialCode, 'MAT-01');
  assert.equal(rows[0].materialName, 'Updated display assembly');
});
