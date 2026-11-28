const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');

const pagination = load('src/lib/listPagination.ts');
const plain = value => JSON.parse(JSON.stringify(value));

test('list pagination rejects invalid values and bounds page size and offset', () => {
  assert.deepEqual(plain(pagination.normalizeListPage({ page: '0', pageSize: -1 })), { page: 1, pageSize: 25 });
  assert.deepEqual(plain(pagination.normalizeListPage({ page: '3.5', pageSize: '1000' })), { page: 1, pageSize: 100 });
  assert.deepEqual(plain(pagination.normalizeListPage({ page: '90000', pageSize: '10' })), { page: 10000, pageSize: 10 });
  assert.deepEqual(plain(pagination.buildPaginatedList([], 0, 4, 25)), { rows: [], total: 0, page: 1, pageSize: 25, totalPages: 1 });
});

function prismaListMock(model, total) {
  let query;
  const prisma = { [model]: {
    count: async args => { query = { count: args }; return total; },
    findMany: async args => { query = { ...query, findMany: args }; return []; },
  } };
  return { prisma, getQuery: () => query };
}

test('Accounting journal list uses tenant scope, stable ordering, page bounds, and a count', async () => {
  const db = prismaListMock('journalEntry', 60);
  const accounting = load('src/lib/accounting.ts', {
    '@/lib/prisma': { prisma: db.prisma },
    '@/lib/withRecordLock': { withRecordLock: (_scope, _id, work) => work() },
    '@/lib/tenant': { assertModuleAccess: async () => {}, assertPartnerCanWrite: async () => {} },
    '@/lib/listPagination': pagination,
  });
  const result = await accounting.listJournalEntriesPaginated('partner-a', { page: 2 });
  assert.equal(result.total, 60);
  assert.equal(result.page, 2);
  assert.equal(result.rows.length, 0);
  assert.deepEqual(plain(db.getQuery().count), { where: { partnerId: 'partner-a' } });
  assert.equal(db.getQuery().findMany.skip, 25);
  assert.equal(db.getQuery().findMany.take, 25);
  assert.deepEqual(plain(db.getQuery().findMany.orderBy), [{ entryDate: 'desc' }, { id: 'desc' }]);
});

test('Wholesale order list clamps an out-of-range page and never crosses partner scope', async () => {
  const db = prismaListMock('wholesaleOrder', 30);
  const wholesale = load('src/lib/wholesaleData.ts', {
    '@/lib/prisma': { prisma: db.prisma },
    '@/lib/tenant': { assertPartnerScope: () => {}, assertModuleAccess: async (_partnerId, moduleSlug) => assert.equal(moduleSlug, 'wholesale-b2b'), assertPartnerCanWrite: async () => {} },
    '@/lib/designer/numbering': { getNextNumber: async () => 'WSO-1' },
    '@/lib/withRecordLock': { withRecordLock: async (_scope, _id, work) => work() },
    '@/components/DataTable': {},
    '@/lib/listPagination': pagination,
    '@/lib/wholesaleStatuses':load('src/lib/wholesaleStatuses.ts'),
  });
  const result = await wholesale.listWholesaleOrdersPaginated('partner-b', { page: 99, pageSize: 10 });
  assert.equal(result.page, 3);
  assert.equal(result.totalPages, 3);
  assert.deepEqual(plain(db.getQuery().count), { where: { partnerId: 'partner-b' } });
  assert.equal(db.getQuery().findMany.skip, 20);
  assert.equal(db.getQuery().findMany.take, 10);
  assert.deepEqual(plain(db.getQuery().findMany.orderBy), [{ createdAt: 'desc' }, { id: 'desc' }]);
});

test('HRMS leave and payroll lists paginate independently and remain partner scoped', async () => {
  const queries = {};
  const prisma = {};
  for (const [model, total] of [['leaveRequest', 51], ['payslip', 49]]) {
    prisma[model] = {
      count: async args => { queries[model] = { count: args }; return total; },
      findMany: async args => { queries[model].findMany = args; return []; },
    };
  }
  const hrms = load('src/lib/hrms.ts', {
    '@/lib/withRecordLock': { withRecordLock: (_scope, _id, work) => work() },
    '@/lib/tenant': { assertModuleAccess: async () => {}, assertPartnerCanWrite: async () => {} },
    '@/lib/databaseTransaction': { afterDatabaseCommit: async work => work() },
    '@/lib/prisma': { prisma },
    'node:crypto': require('node:crypto'),
    '@/lib/requirePartnerSession': { requireSessionPartnerId: async () => 'partner-c' },
    '@/lib/format': { formatDate: value => value, istStartOfDay: value => value },
    '@/lib/telegram': { sendPartnerTelegramAlert: async () => {} },
    '@/lib/partnerData': { getPartner: async () => null },
    '@/lib/telegramTemplates': {},
    '@/lib/email/moduleEmails': {},
    '@/lib/listPagination': pagination,
  });
  const leave = await hrms.listLeaveRequestsPaginated('partner-c', { page: 2 });
  const payroll = await hrms.listPayslipsPaginated('partner-c', { page: 2 });
  assert.equal(leave.totalPages, 3);
  assert.equal(leave.page, 2);
  assert.equal(payroll.totalPages, 2);
  assert.equal(payroll.page, 2);
  for (const model of ['leaveRequest', 'payslip']) {
    assert.deepEqual(plain(queries[model].count.where), { employee: { partnerId: 'partner-c' } });
    assert.deepEqual(plain(queries[model].findMany.where), { employee: { partnerId: 'partner-c' } });
    assert.equal(queries[model].findMany.skip, 25);
    assert.equal(queries[model].findMany.take, 25);
  }
});
