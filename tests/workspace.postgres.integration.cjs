const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const load = require('./loadModule.cjs');
const url = process.env.DATABASE_URL;
if (process.env.MBF_ISOLATED_TEST !== '1' || !['postgres://ci:ci@localhost:5432/ci', 'postgresql://ci:ci@localhost:5432/ci', 'postgresql://ci:ci@127.0.0.1:55439/ci'].includes(url)) throw new Error('Disposable local CI database required.');
const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url } } });
const modules = load('src/lib/designer/modules.ts');
const profiles = load('src/lib/workspaceProfiles.ts', { '@/lib/designer/modules': modules });
let requests = 0;
const summary = load('src/lib/workspaceSummary.ts', {
  '@prisma/client': { Prisma }, '@/lib/workspaceProfiles': profiles,
  '@/lib/safeCache': { safeCache: fn => fn }, '@/lib/designer/entitlements': {},
  '@/lib/prisma': { prisma: { $queryRaw: async sql => { requests++; return prisma.$queryRaw(sql); } } },
});
const partnerId = 'workspace-test-' + crypto.randomUUID();
test('all workspace aggregate SQL executes; values stay tenant-scoped and empty tenants return zero', async () => {
  await prisma.patient.create({ data: { partnerId, name: 'Isolated test patient' } });
  await prisma.businessRecord.create({ data: { partnerId, moduleSlug: 'billing', recordKey: 'invoice', data: { paymentStatus: 'Partially Paid' } } });
  const slugs = modules.MODULES.map(m => m.slug);
  const rows = await summary.loadWorkspaceSummary(partnerId, slugs);
  assert.equal(requests, 1);
  assert.equal(rows.length, 25);
  assert.equal(rows.find(r => r.slug === 'clinic').metrics[0].value, 1);
  assert.equal(rows.find(r => r.slug === 'billing').metrics[1].value, 1);
  const other = await summary.loadWorkspaceSummary(partnerId + '-other', slugs);
  assert.ok(other.every(r => r.metrics.every(m => m.value === 0)));
});
test.after(async () => {
  await prisma.telegramSettings.deleteMany({ where: { partnerId } });
  await prisma.patient.deleteMany({ where: { partnerId } });
  await prisma.businessRecord.deleteMany({ where: { partnerId } });
  await prisma.$disconnect();
});

test('Telegram preference SQL preserves connected chats, send history and unrelated routing', async () => {
  const sent = { DAILY: '2026-10-01T00:00:00Z' };
  await prisma.telegramSettings.create({ data: { partnerId, chatId: 'local-test-chat', lastReportSentAt: sent, routing: { legacySetting: 'group' } } });
  const actions = load('src/lib/workspaceTelegramActions.ts', {
    'next/cache': { revalidatePath() {} }, 'next/navigation': { redirect() {} },
    '@/lib/prisma': { prisma }, '@/lib/requirePartnerSession': { requireSessionPartnerId: async () => {} },
    '@/lib/tenant': { assertPartnerCanWrite: async () => {} },
    '@/lib/designer/entitlements': { getVisibleModuleSlugs: async () => ['clinic'] },
    '@/lib/workspaceProfiles': profiles, '@/lib/workspaceTelegram': { workspaceReportKey: slug => `workspaceModule:${slug}` },
  });
  const form = new FormData();
  for (const key of ['report', 'subscriptionExpiring', 'generalAnnouncement']) form.set(`routing_${key}`, 'personal');
  form.set('reportModules', 'clinic');
  await actions.saveWorkspaceTelegram(partnerId, form);
  const row = await prisma.telegramSettings.findUniqueOrThrow({ where: { partnerId } });
  assert.equal(row.routing.legacySetting, 'group');
  assert.equal(row.routing['workspaceModule:clinic'], 'both');
  assert.equal(row.chatId, 'local-test-chat');
  assert.deepEqual(row.lastReportSentAt, sent);
});
