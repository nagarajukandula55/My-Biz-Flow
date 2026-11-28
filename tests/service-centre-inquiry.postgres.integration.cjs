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
const partnerId = `inquiry-${crypto.randomUUID()}`;
let failInquiryUpdate = false;
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
  updateBusinessRecord: async (p, m, id, data) => {
    if (m === 'service-centre-inquiry' && failInquiryUpdate) throw new Error('Simulated inquiry update failure');
    return prisma.businessRecord.update({ where: { partnerId_moduleSlug_recordKey: { partnerId: p, moduleSlug: m, recordKey: id } }, data: { data } });
  },
};
const actions = load('src/app/partner/[partnerId]/service-centre/inquiries/actions.ts', {
  'next/cache': { revalidatePath: () => {} }, 'next/navigation': { redirect: () => {} },
  '@/lib/businessRecords': store, '@/lib/requirePartnerSession': { requireSessionPartnerId: async p => p },
  '@/lib/serviceCentreCreateAction': { validateServiceCentreWorkorder: async () => null },
  '@/lib/serviceCentreRequiredFields': { SERVICE_CENTRE_REQUIRED_FIELDS: [] },
  '@/lib/designer/numbering': { getNextNumber: async () => `INV-${crypto.randomUUID()}` },
  '@/lib/partnerData': { getPartner: async () => ({ businessName: 'Business', gstin: '' }) },
  '@/lib/prisma': { prisma }, '@/lib/telegram': { sendWorkorderTelegramAlert: async () => {} },
  '@/lib/telegramTemplates': { newWorkorderCreatedMessage: async () => '' },
  '@/lib/recordEntitlement': { assertRecordModuleAccess: async () => {} },
  '@/lib/invoiceNumbering': {
    resolveInvoiceDocumentType: type => type,
    invoiceNumberingConfig: () => ({ documentType: 'invoice.non-gst', defaults: { prefix: 'BILL' } }),
  },
  '@/lib/sample-data/service-centre-inquiry': {
    INQUIRY_CLOSE_REASONS: ['Customer cancelled'],
    effectiveInquiryStatus: record => record.status || (record.convertedToInvoiceId || record.convertedToWorkorderId ? 'Converted' : 'Open'),
  },
  '@/lib/withRecordLock': lock, '@/lib/databaseTransaction': db,
});
const seed = async id => base.businessRecord.create({ data: { partnerId, moduleSlug: 'service-centre-inquiry', recordKey: id, data: { status: 'Open', customerName: 'Customer', customerPhone: '9876543210', complaint: 'Part' } } });
const invoiceInput = { description: 'Part', quantity: 2, amount: 125.5, taxRate: 0, invoiceType: 'Non-GST' };

test('competing cancellation and conversion leave one terminal inquiry outcome', async () => {
  await seed('race');
  const results = await Promise.allSettled([
    actions.cancelInquiryAction(partnerId, 'race', 'Customer cancelled'),
    actions.convertInquiryToSalesInvoiceAction(partnerId, 'race', invoiceInput),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled' && r.value === undefined).length, 1);
  const inquiry = await store.getBusinessRecord(partnerId, 'service-centre-inquiry', 'race');
  const count = await base.businessRecord.count({ where: { partnerId, moduleSlug: 'billing' } });
  assert.ok(inquiry.status === 'Cancelled' && count === 0 || inquiry.status === 'Converted' && count === 1 && inquiry.convertedToInvoiceId);
});

test('failed inquiry link rolls back invoice creation and keeps inquiry Open', async () => {
  await seed('rollback');
  failInquiryUpdate = true;
  await assert.rejects(actions.convertInquiryToSalesInvoiceAction(partnerId, 'rollback', invoiceInput), /Simulated inquiry update failure/);
  failInquiryUpdate = false;
  assert.equal((await store.getBusinessRecord(partnerId, 'service-centre-inquiry', 'rollback')).status, 'Open');
  assert.equal(await base.businessRecord.count({ where: { partnerId, moduleSlug: 'billing', data: { path: ['sourceInquiryId'], equals: 'rollback' } } }), 0);
});

test.after(async () => { await base.businessRecord.deleteMany({ where: { partnerId } }); await base.$disconnect(); });
