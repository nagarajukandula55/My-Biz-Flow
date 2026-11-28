const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');

test('interior progress invoices bill only the unbilled increment and serialize retries', async () => {
  const project = { id: 'project-1', status: 'Approved', customer: 'Customer', lastBilledPercent: 0, billedTotal: 0,
    boqLines: [{ material: 'Tile', quantity: 10, wastagePercent: 0, unit: 'box', unitPrice: 100 }] };
  const invoices = [];
  let queue = Promise.resolve();
  const actions = load('src/app/partner/[partnerId]/interior-design/actions.ts', {
    'next/navigation': { redirect: () => {} },
    '@/lib/requirePartnerSession': { requireSessionPartnerId: async id => id },
    '@/lib/businessRecords': {
      getBusinessRecord: async () => ({ ...project }),
      createBusinessRecord: async (_partner, slug, values) => { assert.equal(slug, 'billing'); invoices.push(values); return { id: `inv-${invoices.length}` }; },
    },
    '@/lib/businessRecordActions': { patchBusinessRecordAction: async (_partner, _slug, _id, values) => Object.assign(project, values) },
    '@/lib/tenant': { assertModuleAccess: async () => {}, assertPartnerCanWrite: async () => {} },
    '@/lib/withRecordLock': { withRecordLock: async (_scope, _id, work) => {
      const previous = queue;
      let release;
      queue = new Promise(resolve => { release = resolve; });
      await previous;
      try { return await work(); } finally { release(); }
    } },
    '@/lib/inventoryStock': { adjustExistingStockRecordQty: async () => {} },
    '@/lib/inventoryRead': { findStockRecord: async () => undefined },
  });
  const first = await Promise.allSettled([
    actions.createInteriorProgressInvoice('p1', 'project-1', 25),
    actions.createInteriorProgressInvoice('p1', 'project-1', 25),
  ]);
  assert.equal(first.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(invoices.length, 1);
  assert.equal(invoices[0].totalAmount, 295);
  await actions.createInteriorProgressInvoice('p1', 'project-1', 50);
  assert.equal(invoices[1].totalAmount, 295);
  assert.equal(invoices[1].billedProgressDelta, 25);
  assert.equal(project.billedTotal, 590);
  await assert.rejects(actions.createInteriorProgressInvoice('p1', 'project-1', Number.NaN), /progress between/);
  assert.equal(invoices.length, 2);
});

test('interior project creation rejects malformed BOQ before any write', async () => {
  let writes = 0;
  const actions = load('src/app/partner/[partnerId]/interior-design/actions.ts', {
    'next/navigation': { redirect: () => {} },
    '@/lib/requirePartnerSession': { requireSessionPartnerId: async id => id },
    '@/lib/businessRecords': { createBusinessRecord: async () => { writes++; } },
    '@/lib/businessRecordActions': { patchBusinessRecordAction: async () => {} },
    '@/lib/tenant': { assertModuleAccess: async () => {}, assertPartnerCanWrite: async () => {} },
    '@/lib/withRecordLock': { withRecordLock: async (_scope, _id, work) => work() },
    '@/lib/inventoryStock': { adjustExistingStockRecordQty: async () => {} },
    '@/lib/inventoryRead': { findStockRecord: async () => undefined },
  });
  const input = new FormData();
  input.set('projectName', 'Home');
  input.set('customer', 'Customer');
  input.set('boqLines', JSON.stringify([{ material: 'Tile', quantity: -1, unitPrice: 50, wastagePercent: 0 }]));
  await assert.rejects(actions.createInteriorProjectAction('p1', input), /BOQ lines require/);
  assert.equal(writes, 0);
});
