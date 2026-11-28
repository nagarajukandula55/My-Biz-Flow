const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const load = require('./loadModule.cjs');
const url = process.env.DATABASE_URL;
if (process.env.MBF_ISOLATED_TEST !== '1' || !['postgresql://ci:ci@127.0.0.1:55439/ci', 'postgresql://ci:ci@localhost:5432/ci', 'postgres://ci:ci@localhost:5432/ci'].includes(url)) throw new Error('Disposable local CI database required');

const { PrismaClient } = require('@prisma/client');
const base = new PrismaClient({ datasources: { db: { url } } });
const db = load('src/lib/databaseTransaction.ts', { 'node:async_hooks': require('node:async_hooks'), '@/lib/databaseClientContext': load('src/lib/databaseClientContext.ts') });
const prisma = db.transactionAwareClient(base);
const lock = load('src/lib/withRecordLock.ts', { '@/lib/prisma': { prisma }, '@/lib/databaseTransaction': db });
const partnerId = `interior-${crypto.randomUUID()}`;
const store = {
  getBusinessRecord: async (p, m, id) => {
    const row = await prisma.businessRecord.findUnique({ where: { partnerId_moduleSlug_recordKey: { partnerId: p, moduleSlug: m, recordKey: id } } });
    return row ? { ...row.data, id: row.recordKey } : undefined;
  },
  createBusinessRecord: async (p, m, data) => {
    const id = crypto.randomUUID();
    await prisma.businessRecord.create({ data: { partnerId: p, moduleSlug: m, recordKey: id, data } });
    return { ...data, id };
  },
  updateBusinessRecord: async (p, m, id, data) => prisma.businessRecord.update({ where: { partnerId_moduleSlug_recordKey: { partnerId: p, moduleSlug: m, recordKey: id } }, data: { data } }),
};
const actions = load('src/app/partner/[partnerId]/interior-design/actions.ts', {
  'next/navigation': { redirect: () => {} },
  '@/lib/requirePartnerSession': { requireSessionPartnerId: async id => id },
  '@/lib/businessRecords': store,
  '@/lib/businessRecordActions': { patchBusinessRecordAction: async (p, m, id, values) => {
    const current = await store.getBusinessRecord(p, m, id);
    await store.updateBusinessRecord(p, m, id, { ...current, ...values });
  } },
  '@/lib/withRecordLock': lock,
  '@/lib/tenant': { assertModuleAccess: async () => {}, assertPartnerCanWrite: async () => {} },
  '@/lib/inventoryRead': { findStockRecord: async (p, materialId, warehouse) => {
    const rows = await prisma.businessRecord.findMany({ where: { partnerId: p, moduleSlug: 'inventory-stock' } });
    const row = rows.find(r => r.data.materialId === materialId && r.data.warehouseName === warehouse);
    return row ? { ...row.data, id: row.recordKey } : undefined;
  } },
  '@/lib/inventoryStock': { adjustExistingStockRecordQty: async (p, id, delta) => {
    const row = await store.getBusinessRecord(p, 'inventory-stock', id);
    const qtyOnHand = row.qtyOnHand + delta;
    await store.updateBusinessRecord(p, 'inventory-stock', id, { ...row, qtyOnHand, availableQty: qtyOnHand - row.reservedQty });
  } },
});
const seed = async (m, id, data) => base.businessRecord.create({ data: { partnerId, moduleSlug: m, recordKey: id, data } });

test('interior billing and stock consumption serialize duplicate submissions and retain one outcome', async () => {
  await seed('interior-design', 'project', { status: 'Approved', customer: 'Customer', boqLines: [{ material: 'Tile', materialId: 'tile', quantity: 4, unitPrice: 50, wastagePercent: 0 }] });
  await seed('inventory-stock', 'bucket', { materialId: 'tile', warehouseName: 'Main Warehouse', qtyOnHand: 5, reservedQty: 1, availableQty: 4 });
  const bills = await Promise.allSettled([actions.createInteriorProgressInvoice(partnerId, 'project', 25), actions.createInteriorProgressInvoice(partnerId, 'project', 25)]);
  assert.equal(bills.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await prisma.businessRecord.count({ where: { partnerId, moduleSlug: 'billing' } })), 1);
  const consumes = await Promise.allSettled([actions.consumeApprovedInteriorBoq(partnerId, 'project'), actions.consumeApprovedInteriorBoq(partnerId, 'project')]);
  assert.equal(consumes.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await store.getBusinessRecord(partnerId, 'inventory-stock', 'bucket')).qtyOnHand, 1);
  assert.ok((await store.getBusinessRecord(partnerId, 'interior-design', 'project')).stockConsumedAt);
});

test('insufficient available BOQ stock rolls back the whole project consumption', async () => {
  await seed('interior-design', 'short', { status: 'Approved', boqLines: [{ material: 'Tile', materialId: 'tile', quantity: 1 }, { material: 'Other', materialId: 'missing', quantity: 1 }] });
  await assert.rejects(actions.consumeApprovedInteriorBoq(partnerId, 'short'), /Insufficient stock/);
  assert.equal((await store.getBusinessRecord(partnerId, 'inventory-stock', 'bucket')).qtyOnHand, 1);
  assert.equal((await store.getBusinessRecord(partnerId, 'interior-design', 'short')).stockConsumedAt, undefined);
});

test.after(async () => { await base.businessRecord.deleteMany({ where: { partnerId } }); await base.$disconnect(); });
