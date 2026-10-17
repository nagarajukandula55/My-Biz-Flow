const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');

test('Service Centre list pagination uses two scoped bounded queries and clamps unsafe pages', async () => {
  for (const input of ['Infinity', '1.5', '-3', 'NaN', '999999', undefined, '2']) {
    const calls = [];
    const lists = load('src/lib/serviceCentreListData.ts', {
      '@/lib/businessRecords': { DEFAULT_BUSINESS_RECORD_PAGE_SIZE: 25 },
      '@/lib/prisma': { prisma: { businessRecord: {
        count: async args => { calls.push(['count', args]); return 26; },
        findMany: async args => { calls.push(['findMany', args]); return [{ recordKey: 'customer-1', data: { name: 'Synthetic' }, createdAt: new Date('2030-01-01') }]; },
      } } },
    });
    const result = await lists.listServiceCentrePage('owner', 'service-centre-customers', input);
    assert.equal(calls.length, 2);
    assert.equal(calls[0][0], 'count');
    assert.equal(calls[1][1].take, 25);
    assert.equal(calls[1][1].skip, input === '999999' || input === '2' ? 25 : 0);
    for (const [, args] of calls) { assert.equal(args.where.partnerId, 'owner'); assert.equal(args.where.moduleSlug, 'service-centre-customers'); }
    assert.equal(result.rows[0].id, 'customer-1');
  }
});

test('Deferred customer export rechecks session, module, tier and OTP before reading any contacts', async () => {
  for (const denied of ['session', 'module', 'tier', 'otp', null]) {
    let reads = 0;
    const checks = [];
    const check = key => { checks.push(key); if (denied === key) throw Error('Denied'); };
    const actions = load('src/app/partner/[partnerId]/service-centre/exportActions.ts', {
      '@/lib/requirePartnerSession': { requireSessionPartnerId: async id => { assert.equal(id, 'owner'); check('session'); } },
      '@/lib/tenant': { assertModuleAccess: async (id, slug) => { assert.equal(slug, 'service-centre'); check('module'); }, assertPageTierAccess: async (id, page) => { assert.equal(page, 'service-centre.customers.list'); check('tier'); } },
      '@/lib/customerDataAccess': { isCustomerDataUnlocked: async () => { checks.push('otp'); return denied !== 'otp'; } },
      '@/lib/businessRecords': { listBusinessRecords: async (id, slug) => { reads++; assert.equal(id, 'owner'); assert.equal(slug, 'service-centre-customers'); return [{ id: 'one' }, { id: 'last' }]; } },
    });
    if (denied) { await assert.rejects(actions.loadCustomerExportRows('owner')); assert.equal(reads, 0); }
    else { assert.equal((await actions.loadCustomerExportRows('owner')).length, 2); assert.equal(reads, 1); assert.equal(checks.join(','), 'session,module,tier,otp'); }
  }
});

test('Deferred inquiry export rejects unauthorized sessions and revoked module access', async () => {
  for (const denied of ['session', 'module', null]) {
    let reads = 0;
    const actions = load('src/app/partner/[partnerId]/service-centre/exportActions.ts', {
      '@/lib/requirePartnerSession': { requireSessionPartnerId: async () => { if (denied === 'session') throw Error('Denied'); } },
      '@/lib/tenant': { assertModuleAccess: async () => { if (denied === 'module') throw Error('Denied'); } },
      '@/lib/customerDataAccess': {},
      '@/lib/businessRecords': { listBusinessRecords: async (id, slug) => { reads++; assert.equal(slug, 'service-centre-inquiry'); return [{ id: 'inquiry' }]; } },
    });
    if (denied) { await assert.rejects(actions.loadInquiryExportRows('owner')); assert.equal(reads, 0); }
    else { assert.equal((await actions.loadInquiryExportRows('owner')).length, 1); assert.equal(reads, 1); }
  }
});

test('Deferred CSV buttons preserve full export content and filenames and never download rejected loads', async () => {
  const rows = [{ id: 'first', name: 'A, "quoted" name' }, { id: 'last', name: 'Last record' }];
  for (const customer of [true, false]) {
    let blob, downloadedName, loads = 0;
    const jsx = (type, props) => ({ type, props });
    const file = customer ? 'src/app/partner/[partnerId]/service-centre/customers/CustomerDataExportButton.tsx' : 'src/components/RecordCsvExportButton.tsx';
    const module = load(file, {
      react: { useState: initial => [initial, () => {}] },
      'react/jsx-runtime': { jsx, jsxs: jsx },
      '@/lib/format': { formatDateForExport: value => value },
    }, {
      Blob,
      URL: { createObjectURL: value => { blob = value; return 'blob:synthetic'; }, revokeObjectURL: () => {} },
      document: { createElement: () => ({ set download(value) { downloadedName = value; }, click() {} }) },
    });
    const Component = customer ? module.CustomerDataExportButton : module.RecordCsvExportButton;
    const props = { columns: [{ key: 'name', label: 'Customer name' }], rows: [{ id: 'page-only', name: 'Must not export page-only rows' }], filename: 'inquiries-owner-2030-01-01.csv', loadRows: async () => { loads++; return rows; } };
    const rendered = Component(props);
    const button = rendered.props.children.find(child => child?.type === 'button');
    assert.equal(loads, 0);
    await button.props.onClick();
    assert.equal(loads, 1);
    const bytes = Buffer.from(await blob.arrayBuffer()).toString('utf8');
    assert.equal(bytes, '\uFEFF' + (customer ? 'Customer name' : 'name') + '\n"A, ""quoted"" name"\nLast record');
    if (customer) assert.match(downloadedName, /^customers-\d{4}-\d{2}-\d{2}\.csv$/);
    else assert.equal(downloadedName, props.filename);
    const original = Component({ ...props, rows, loadRows: undefined });
    await original.props.children.find(child => child?.type === 'button').props.onClick();
    assert.equal(Buffer.from(await blob.arrayBuffer()).toString('utf8'), bytes);
    assert.equal(loads, 1);
    blob = undefined;
    const denied = Component({ ...props, loadRows: async () => { throw Error('Expired session'); } });
    await denied.props.children.find(child => child?.type === 'button').props.onClick();
    assert.equal(blob, undefined);
  }
});
