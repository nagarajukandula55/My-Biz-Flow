const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');

function harness() {
  const records = new Map([['service-centre-inquiry:one', { id: 'one', status: 'Open', customerName: 'Customer', customerPhone: '9876543210', complaint: 'Repair enquiry' }]]);
  let queue = Promise.resolve();
  let serial = 0;
  const actions = load('src/app/partner/[partnerId]/service-centre/inquiries/actions.ts', {
    'next/cache': { revalidatePath: () => {} },
    'next/navigation': { redirect: () => {} },
    '@/lib/businessRecords': {
      getBusinessRecord: async (_partner, module, id) => records.get(`${module}:${id}`),
      createBusinessRecord: async (_partner, module, values) => {
        const id = `created-${++serial}`;
        records.set(`${module}:${id}`, { ...values, id });
        return { ...values, id };
      },
      updateBusinessRecord: async (_partner, module, id, values) => {
        records.set(`${module}:${id}`, { ...values, id });
      },
    },
    '@/lib/requirePartnerSession': { requireSessionPartnerId: async id => id },
    '@/lib/serviceCentreCreateAction': { validateServiceCentreWorkorder: async () => null },
    '@/lib/serviceCentreRequiredFields': { SERVICE_CENTRE_REQUIRED_FIELDS: [] },
    '@/lib/designer/numbering': { getNextNumber: async () => `INV-${serial + 1}` },
    '@/lib/partnerData': { getPartner: async () => ({ businessName: 'Business', gstin: 'GSTIN' }) },
    '@/lib/prisma': { prisma: { postalPincode: { findFirst: async () => null } } },
    '@/lib/telegram': { sendWorkorderTelegramAlert: async () => {} },
    '@/lib/telegramTemplates': { newWorkorderCreatedMessage: async () => '' },
    '@/lib/recordEntitlement': { assertRecordModuleAccess: async () => {} },
    '@/lib/sample-data/service-centre-inquiry': {
      INQUIRY_CLOSE_REASONS: ['Customer not interested', 'Duplicate inquiry'],
      effectiveInquiryStatus: record => record.status || (record.convertedToInvoiceId || record.convertedToWorkorderId ? 'Converted' : 'Open'),
    },
    '@/lib/invoiceNumbering': {
      resolveInvoiceDocumentType: type => type,
      invoiceNumberingConfig: type => ({ documentType: type === 'GST' ? 'invoice.gst' : 'invoice.non-gst', defaults: { prefix: 'INV' } }),
    },
    '@/lib/withRecordLock': { withRecordLock: async (_scope, _id, work) => {
      const previous = queue;
      let release;
      queue = new Promise(resolve => { release = resolve; });
      await previous;
      try { return await work(); } finally { release(); }
    } },
    '@/lib/databaseTransaction': { afterDatabaseCommit: async work => work() },
  });
  return { actions, records };
}

test('cancellation keeps the inquiry and refuses a second conversion', async () => {
  const { actions, records } = harness();
  await actions.cancelInquiryAction('partner', 'one', 'Customer not interested');
  assert.equal(records.get('service-centre-inquiry:one').status, 'Cancelled');
  assert.equal(records.get('service-centre-inquiry:one').cancelReason, 'Customer not interested');
  const result = await actions.convertInquiryToSalesInvoiceAction('partner', 'one', { description: 'Repair', amount: 100, taxRate: 0, invoiceType: 'Non-GST' });
  assert.match(result.error, /Only an Open inquiry/);
  assert.equal([...records.keys()].filter(k => k.startsWith('billing:')).length, 0);
});

test('competing invoice conversions issue one numbered draft and link it to the inquiry', async () => {
  const { actions, records } = harness();
  const values = { description: 'Replacement part', quantity: 2, amount: 125.50, taxRate: 18, hsnCode: '8473', invoiceType: 'GST' };
  const attempts = await Promise.all([actions.convertInquiryToSalesInvoiceAction('partner', 'one', values), actions.convertInquiryToSalesInvoiceAction('partner', 'one', values)]);
  assert.equal(attempts.filter(value => value === undefined).length, 1);
  assert.match(attempts.find(Boolean).error, /Only an Open inquiry/);
  const invoices = [...records.entries()].filter(([key]) => key.startsWith('billing:'));
  assert.equal(invoices.length, 1);
  assert.equal(invoices[0][1].totalAmount, 296.18);
  assert.equal(invoices[0][1].items[0].quantity, 2);
  assert.equal(invoices[0][1].paymentStatus, 'Draft');
  assert.equal(records.get('service-centre-inquiry:one').convertedToInvoiceId, invoices[0][1].id);
  assert.equal(records.get('service-centre-inquiry:one').conversionType, 'Sales Invoice');
});

test('editing a legacy inquiry without status restores Open without deleting its history', async () => {
  const { actions, records } = harness();
  records.set('service-centre-inquiry:one', { id: 'one', customerName: 'Old', customerPhone: '9876543210', source: 'Staff', createdAt: '2026-11-01' });
  await actions.updateInquiryAction('partner', 'one', { customerName: 'Corrected', customerPhone: '9876543210', status: 'Converted' });
  const updated = records.get('service-centre-inquiry:one');
  assert.equal(updated.customerName, 'Corrected');
  assert.equal(updated.source, 'Staff');
  assert.equal(updated.status, 'Open');
  await actions.cancelInquiryAction('partner', 'one', 'Duplicate inquiry');
  assert.equal(records.get('service-centre-inquiry:one').status, 'Cancelled');
});

test('invoice conversion refuses malformed billing before consuming a number', async () => {
  const { actions, records } = harness();
  const bad = await actions.convertInquiryToSalesInvoiceAction('partner', 'one', { description: 'Part', amount: 100, taxRate: 18, invoiceType: 'Non-GST' });
  assert.match(bad.error, /zero tax/);
  const missingCode = await actions.convertInquiryToSalesInvoiceAction('partner', 'one', { description: 'Part', amount: 100, taxRate: 18, invoiceType: 'GST' });
  assert.match(missingCode.error, /HSN\/SAC/);
  assert.equal(records.get('service-centre-inquiry:one').status, 'Open');
  assert.equal([...records.keys()].filter(k => k.startsWith('billing:')).length, 0);
});

test('generic record actions cannot bypass inquiry lifecycle guards', async () => {
  let writes = 0;
  const generic = load('src/lib/businessRecordActions.ts', {
    'next/cache': { revalidatePath: () => {} }, 'next/navigation': { redirect: () => {} },
    '@/lib/businessRecords': { getBusinessRecord: async () => ({ status: 'Cancelled' }), createBusinessRecord: async () => { writes++; }, updateBusinessRecord: async () => { writes++; } },
    '@/lib/partnerData': { getPartner: async () => null }, '@/lib/centralApi': { notifyCentralApiBillingInvoice: async () => {} },
    '@/lib/requirePartnerSession': { requireSessionPartnerId: async id => id },
    '@/lib/withRecordLock': { withRecordLock: async (_scope, _id, work) => work() },
    '@/lib/invoiceInventory': { hasInventoryLines: () => false }, '@/lib/inventoryStock': {}, '@/lib/barcodeCatalog': {}, '@/lib/tenant': {},
    '@/lib/recordEntitlement': { assertRecordModuleAccess: async () => {} },
  });
  await assert.rejects(generic.createBusinessRecordAction('partner', 'service-centre-inquiry', { status: 'Open' }), /inquiry workflow/);
  await assert.rejects(generic.updateBusinessRecordAction('partner', 'service-centre-inquiry', 'one', { status: 'Open' }), /inquiry workflow/);
  await assert.rejects(generic.patchBusinessRecordAction('partner', 'service-centre-inquiry', 'one', { status: 'Open' }), /inquiry workflow/);
  assert.equal(writes, 0);
});
