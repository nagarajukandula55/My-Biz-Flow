const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');

test('analytics insights read only enabled module data', async () => {
  const reads = [];
  let amcReads = 0;
  let wholesaleReads = 0;
  const { getWorkflowInsights } = load('src/lib/workflowInsights.ts', {
    '@/lib/businessRecords': { listBusinessRecords: async (partnerId, partition) => {
      assert.equal(partnerId, 'sc-1');
      reads.push(partition);
      return partition === 'billing' ? [{ paymentStatus: 'Overdue' }] : [];
    } },
    '@/lib/amcContractsData': {
      listAmcContractsWithVisits: async () => { amcReads++; return []; },
      findOpenVisit: () => null,
      computeSlaBreach: () => false,
    },
    '@/lib/wholesaleData': { listWholesaleOrders: async () => { wholesaleReads++; return []; } },
  });

  const insights = await getWorkflowInsights('sc-1', ['service-centre', 'billing']);
  assert.deepEqual(reads, ['billing', 'service-centre']);
  assert.equal(amcReads, 0);
  assert.equal(wholesaleReads, 0);
  assert.equal(insights[0]?.key, 'overdue-invoices');

  reads.length = 0;
  await getWorkflowInsights('sc-1', ['amc-field-service', 'wholesale-b2b']);
  assert.deepEqual(reads, ['wholesale-b2b', 'wholesale-dispatch', 'wholesale-fulfillment']);
  assert.equal(amcReads, 1);
  assert.equal(wholesaleReads, 1);
});
