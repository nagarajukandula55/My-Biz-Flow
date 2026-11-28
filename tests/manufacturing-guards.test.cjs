const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');

test('Manufacturing rejects disabled module, expired trial, and invalid BOM inputs before Prisma writes', async () => {
  let writes = 0;
  let enabled = false;
  let writable = true;
  const data = load('src/lib/manufacturing.ts', {
    '@/lib/prisma': { prisma: { billOfMaterial: { create: async () => { writes++; } } } },
    '@/lib/withRecordLock': { withRecordLock: async (_scope, _id, fn) => fn() },
    '@/lib/manufacturingTypes': load('src/lib/manufacturingTypes.ts'),
    '@/lib/tenant': { assertPartnerCanWrite: async () => { if (!writable) throw new Error('trial expired'); } },
    '@/lib/recordEntitlement': { assertRecordModuleAccess: async () => { if (!enabled) throw new Error('module disabled'); } },
  });
  const input = { productName: 'Product', lines: [{ materialId: 'm1', materialLabel: 'Raw', quantity: 1, unitCost: 100 }] };
  await assert.rejects(data.createBom('p1', input), /module disabled/);
  enabled = true;
  writable = false;
  await assert.rejects(data.createBom('p1', input), /trial expired/);
  writable = true;
  await assert.rejects(data.createBom('p1', { ...input, lines: [] }), /at least one BOM line/);
  await assert.rejects(data.createBom('p1', { ...input, lines: [{ ...input.lines[0], unitCost: 1.5 }] }), /valid paise cost/);
  assert.equal(writes, 0);
});
