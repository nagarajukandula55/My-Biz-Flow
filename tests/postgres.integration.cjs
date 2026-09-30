// This suite refuses every database except the disposable local CI service.
const assert = require('node:assert/strict');
const test = require('node:test');
const crypto = require('node:crypto');
const asyncHooks = require('node:async_hooks');
const load = require('./loadModule.cjs');
const url = process.env.DATABASE_URL;
if (process.env.MBF_ISOLATED_TEST !== '1' || !['postgres://ci:ci@localhost:5432/ci','postgresql://ci:ci@localhost:5432/ci','postgresql://ci:ci@127.0.0.1:55439/ci'].includes(url)) {
 throw new Error('Integration tests require MBF_ISOLATED_TEST=1 and the disposable localhost CI database. Production connections are forbidden.');
}
const { PrismaClient } = require('@prisma/client');
const base = new PrismaClient({ datasources: { db: { url } } });
const db = load('src/lib/databaseTransaction.ts', { 'node:async_hooks': asyncHooks, '@/lib/databaseClientContext': load('src/lib/databaseClientContext.ts') });
const prisma = db.transactionAwareClient(base);
const lock = load('src/lib/withRecordLock.ts', { '@/lib/prisma': { prisma }, '@/lib/databaseTransaction': db });
const partnerId = 'isolated-test-' + crypto.randomUUID();

test('PostgreSQL serializes stock mutations, rolls back writes and suppresses rollback notifications', async () => {
 const where = { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: 'inventory-stock', recordKey: 'stock' } };
 await base.businessRecord.create({ data: { partnerId, moduleSlug: 'inventory-stock', recordKey: 'stock', data: { qtyOnHand: 10 } } });
 let delivered = 0;
 const consume = () => lock.withRecordLock('inventory-partner', partnerId, async () => {
  const row = await prisma.businessRecord.findUniqueOrThrow({ where });
  await new Promise(resolve => setTimeout(resolve, 30));
  await prisma.businessRecord.update({ where, data: { data: { qtyOnHand: row.data.qtyOnHand - 1 } } });
 });
 await Promise.all([consume(), consume()]);
 assert.equal((await base.businessRecord.findUniqueOrThrow({ where })).data.qtyOnHand, 8);
 await assert.rejects(lock.withRecordLock('inventory-partner', partnerId, async () => {
  await prisma.businessRecord.update({ where, data: { data: { qtyOnHand: 0 } } });
  await db.afterDatabaseCommit(async () => { delivered++; });
  throw new Error('abort stock operation');
 }), /abort stock operation/);
 assert.equal((await base.businessRecord.findUniqueOrThrow({ where })).data.qtyOnHand, 8);
 assert.equal(delivered, 0);
});

test('PostgreSQL overlapping recurring runs create exactly one numbered invoice', async () => {
 const format = load('src/lib/designer/numberingFormat.ts');
 const numbering = load('src/lib/designer/numbering.ts', { '@/lib/prisma': { prisma }, './numberingFormat': format });
 const runner = load('src/lib/recurringInvoiceRunner.ts', {
  'node:crypto': crypto, '@/lib/prisma': { prisma }, '@/lib/tenant': { assertPartnerCanWrite: async id => assert.equal(id, partnerId) },
  '@/lib/designer/numbering': numbering,
  '@/lib/sample-data/billing-recurring': { RECURRING_FREQUENCIES: ['Monthly'], advanceNextRunDate: () => '2026-10-30' },
 });
 await base.businessRecord.create({ data: { partnerId, moduleSlug: 'billing-recurring', recordKey: 'template', data: { status: 'Active', frequency: 'Monthly', nextRunDate: '2026-09-30', totalAmount: 100 } } });
 const run = () => runner.createDueRecurringInvoice(partnerId, 'template', '2026-09-30', '2026-09-30');
 assert.equal((await Promise.all([run(), run()])).filter(Boolean).length, 1);
 const rows = await base.businessRecord.findMany({ where: { partnerId, moduleSlug: 'billing' } });
 assert.equal(rows.length, 1); assert.ok(rows[0].data.invoiceNumber);
});


test('real inventory helpers serialize first receipts and roll back bucket transfers', async () => {
 const records = load('src/lib/businessRecords.ts', {
  '@/lib/prisma': { prisma }, '@/lib/safeCache': { safeCache: fn => fn },
  '@/lib/tenant': { assertPartnerCanWrite: async id => assert.equal(id, partnerId) },
 });
 const read = load('src/lib/inventoryRead.ts', { '@/lib/businessRecords': records });
 const stock = load('src/lib/inventoryStock.ts', { '@/lib/inventoryRead': read, '@/lib/businessRecords': records, '@/lib/withRecordLock': lock });
 const receive = () => stock.adjustStockQty(partnerId, 'MAT-TEST', 'MAT-TEST', 'Test warehouse', 5);
 await Promise.all([receive(), receive()]);
 assert.equal(await stock.getQtyOnHand(partnerId, 'MAT-TEST', 'Test warehouse'), 10);
 const matching = (await records.listBusinessRecords(partnerId, 'inventory-stock')).filter(row => row.materialId === 'MAT-TEST');
 assert.equal(matching.length, 1);
 await assert.rejects(lock.withRecordLock('inventory-partner', partnerId, async () => {
  await stock.moveGoodToDefective(partnerId, 'MAT-TEST', 'MAT-TEST', 'Test warehouse', 2);
  throw new Error('later ledger failure');
 }), /later ledger failure/);
 assert.equal(await stock.getQtyOnHand(partnerId, 'MAT-TEST', 'Test warehouse'), 10);
 assert.equal(await stock.getQtyOnHand(partnerId, 'MAT-TEST', 'Test warehouse', 'Defective'), 0);
});

test.after(async () => {
 await base.businessRecord.deleteMany({ where: { partnerId } });
 await base.numberingCounter.deleteMany({ where: { scopeKey: { startsWith: `partner:${partnerId}:` } } });
 await base.$disconnect();
});
