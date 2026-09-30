const assert = require('node:assert/strict');
const test = require('node:test');
const load = require('./loadModule.cjs');
const crypto = require('node:crypto');

test('overlapping recurring runs create one invoice and roll back number/invoice on failure', async () => {
  let state = { template: { status: 'Active', nextRunDate: '2026-09-30', frequency: 'Monthly', totalAmount: 100 }, invoices: [], counter: 0 };
  let failSchedule = true, tail = Promise.resolve();
  const prisma = { $transaction: async fn => {
    const previous = tail; let release; tail = new Promise(resolve => { release = resolve; }); await previous;
    const draft = structuredClone(state); let locked = false;
    const tx = {
      $queryRaw: async (sql, ...args) => { assert.match(sql.join('?'), /FOR UPDATE/); assert.deepEqual(args, ['p1', 't1']); locked = true; },
      businessRecord: {
        findUnique: async () => { assert.equal(locked, true); return { id: 'internal-id', data: draft.template }; },
        create: async ({ data }) => { assert.equal(data.moduleSlug, 'billing'); draft.invoices.push(data); },
        update: async ({ data }) => { if (failSchedule) throw new Error('schedule failed'); draft.template = data.data; },
      },
      nextNumber: () => `BILL-${++draft.counter}`,
    };
    try { const result = await fn(tx); state = draft; return result; } finally { release(); }
  } };
  const runner = load('src/lib/recurringInvoiceRunner.ts', {
    'node:crypto': crypto, '@/lib/prisma': { prisma }, '@/lib/tenant': { assertPartnerCanWrite: async () => {} },
    '@/lib/designer/numbering': { getNextNumber: async (type, partner, defaults, tx) => { assert.equal(type, 'invoice.b2c'); return tx.nextNumber(); } },
    '@/lib/sample-data/billing-recurring': { RECURRING_FREQUENCIES: ['Monthly'], advanceNextRunDate: () => '2026-10-30' },
  });
  const run = () => runner.createDueRecurringInvoice('p1', 't1', '2026-09-30', '2026-09-30');
  await assert.rejects(run(), /schedule failed/);
  assert.equal(state.invoices.length, 0); assert.equal(state.counter, 0); assert.equal(state.template.nextRunDate, '2026-09-30');
  failSchedule = false;
  assert.deepEqual(await Promise.all([run(), run()]), [true, false]);
  assert.equal(state.invoices.length, 1); assert.equal(state.counter, 1);
  assert.equal(state.invoices[0].data.invoiceNumber, 'BILL-1');
  assert.equal(state.invoices[0].data.recurringPeriod, '2026-09-30');
  assert.equal(state.template.nextRunDate, '2026-10-30');
});
