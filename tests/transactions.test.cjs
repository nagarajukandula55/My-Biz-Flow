const assert = require('node:assert/strict');
const test = require('node:test');
const load = require('./loadModule.cjs');
const asyncHooks = require('node:async_hooks');

function harness() {
  const db = load('src/lib/databaseTransaction.ts', { 'node:async_hooks': asyncHooks, '@/lib/databaseClientContext': load('src/lib/databaseClientContext.ts') });
  let state = { value: 10 }, transactions = 0, deliveries = 0;
  const base = { record: { read: async () => state.value }, $transaction: async fn => {
    transactions++;
    const draft = { ...state };
    const tx = { record: { read: async () => draft.value, write: async value => { draft.value = value; } }, $executeRaw: async () => {} };
    const result = await fn(tx); state = draft; return result;
  } };
  const prisma = db.transactionAwareClient(base);
  const lock = load('src/lib/withRecordLock.ts', { '@/lib/prisma': { prisma }, '@/lib/databaseTransaction': db });
  return { db, prisma, lock, state: () => state.value, transactions: () => transactions, delivery: () => { deliveries++; }, deliveries: () => deliveries };
}

test('record lock routes nested writes to one transaction and sends only after commit', async () => {
  const h = harness();
  await assert.rejects(h.lock.withRecordLock('stock','p1', async () => {
    await h.prisma.record.write(5);
    await h.db.afterDatabaseCommit(async () => h.delivery());
    throw new Error('later failure');
  }), /later failure/);
  assert.equal(h.state(), 10); assert.equal(h.deliveries(), 0);
  await h.lock.withRecordLock('stock','p1', async () => {
    await h.prisma.record.write(7);
    await h.lock.withRecordLock('workorder','p1:wo', async () => {
      assert.equal(await h.prisma.record.read(), 7);
      await h.prisma.$transaction(async tx => tx.record.write(6));
      await h.prisma.$transaction([h.prisma.record.write(4)]);
    });
    await h.db.afterDatabaseCommit(async () => { assert.equal(h.state(), 4); h.delivery(); });
  });
  assert.equal(h.state(), 4); assert.equal(h.deliveries(), 1); assert.equal(h.transactions(), 2);
  assert.equal(h.db.inDatabaseTransaction(), false);
});

test('inventory form validation rolls back previous writes and navigation follows commit', async () => {
  const h = harness(); let destination;
  const actions = load('src/lib/inventoryAction.ts', {
    'next/navigation': { redirect: url => { destination = url; assert.equal(h.state(), 3); throw new Error('navigation'); } },
    '@/lib/requirePartnerSession': { requireSessionPartnerId: async () => 'p1' },
    '@/lib/withRecordLock': h.lock,
  });
  const result = await actions.withInventoryAction('p1', async () => { await h.prisma.record.write(2); return { error: 'second line invalid' }; });
  assert.equal(result.error, 'second line invalid'); assert.equal(h.state(), 10);
  await assert.rejects(actions.withInventoryAction('p1', async () => { await h.prisma.record.write(3); actions.redirectAfterInventoryWrite('/complete'); }), /navigation/);
  assert.equal(h.state(), 3); assert.equal(destination, '/complete');
});

test('transaction contexts do not leak between simultaneous requests', async () => {
  const h = harness(); let release, entered;
  const started = new Promise(resolve => { entered = resolve; }); const pause = new Promise(resolve => { release = resolve; });
  const work = h.lock.withRecordLock('stock','p1', async () => { await h.prisma.record.write(1); entered(); await pause; assert.equal(await h.prisma.record.read(), 1); });
  await started; assert.equal(await h.prisma.record.read(), 10); release(); await work;
});
