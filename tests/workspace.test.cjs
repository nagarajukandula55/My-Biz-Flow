const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const load = require('./loadModule.cjs');
const { Prisma } = require('@prisma/client');
const modules = load('src/lib/designer/modules.ts');
const profiles = load('src/lib/workspaceProfiles.ts', { '@/lib/designer/modules': modules });

test('Service Centre protected source files remain byte-equivalent after newline normalization', () => {
  for (const [file, hash] of Object.entries(require('./service-centre-baseline.json'))) {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).digest('hex'), hash, file);
  }
});

test('every registered module has a workspace profile with real tables, columns and management routes', () => {
  const all = profiles.getWorkspaceProfiles(modules.MODULES.map(m => m.slug));
  assert.equal(all.length, 26);
  assert.equal(profiles.getWorkspaceProfiles(['unknown']).length, 0);
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
  for (const profile of all) {
    if (profile.slug === 'service-centre') { assert.equal(profile.sources.length, 0); continue; }
    assert.ok(profile.sources.length > 0, profile.slug);
    for (const source of profile.sources) {
      const model = [...schema.matchAll(/model (\w+) \{([\s\S]*?)\n\}/g)].find(m => m[2].includes(`@@map("${source.table}")`));
      assert.ok(model, source.table);
      assert.match(model[2], /\bpartnerId\s+String/);
      if (source.state && !source.state.json) assert.ok(model[2].includes(source.state.column), source.state.column);
    }
    for (const link of profile.settings) assert.ok(fs.existsSync(`src/app/partner/[partnerId]/${link.path}/page.tsx`), link.path);
  }
});

test('summaries use one parameterized aggregate and query only selected modules', async () => {
  let requests = [];
  const api = load('src/lib/workspaceSummary.ts', {
    '@prisma/client': { Prisma }, '@/lib/workspaceProfiles': profiles,
    '@/lib/safeCache': { safeCache: fn => fn },
    '@/lib/designer/entitlements': { getVisibleModuleSlugs: async () => ['clinic'] },
    '@/lib/prisma': { prisma: { $queryRaw: async sql => {
      requests.push(sql);
      return [{ module: 'clinic', source: 0, total: 3n, matching: 0n }, { module: 'clinic', source: 1, total: 4n, matching: 2n }];
    } } },
  });
  assert.equal((await api.loadWorkspaceSummary('p1', [])).length, 0);
  assert.equal((await api.loadWorkspaceSummary('p1', ['unknown', 'service-centre'])).length, 0);
  assert.equal(requests.length, 0);
  const summary = await api.getWorkspaceSummary("tenant' SQL");
  assert.equal(requests.length, 1);
  assert.ok(requests[0].sql.includes('count(*)'));
  assert.ok(requests[0].sql.includes('"patients"'));
  assert.ok(!requests[0].sql.includes('business_records'));
  assert.ok(!requests[0].sql.includes("tenant' SQL"));
  assert.equal(requests[0].values.filter(v => v === "tenant' SQL").length, 2);
  assert.equal(summary[0].metrics[2].value, 2);
});

test('numbering and live Telegram event options are module-specific', () => {
  assert.equal(profiles.documentBelongsToWorkspace('service-centre.workorder', ['clinic']), false);
  assert.equal(profiles.documentBelongsToWorkspace('invoice.b2c', ['billing']), true);
  assert.equal(profiles.documentBelongsToWorkspace('inventory.stock-take', ['clinic']), false);
  assert.ok(profiles.workspaceAlertKeys(['manufacturing']).includes('productionCompleted'));
  assert.ok(!profiles.workspaceAlertKeys(['manufacturing']).includes('newWorkorder'));
  assert.ok(!profiles.workspaceAlertKeys(['education']).includes('educationFeeOverdue'));
  assert.equal(profiles.workspaceTelegramCommandAllowed('pna_report', ['clinic']), false);
  assert.equal(profiles.workspaceTelegramCommandAllowed('production_completed', ['manufacturing']), true);
  assert.equal(profiles.workspaceTelegramCommandAllowed('production_completed', ['clinic']), false);
  assert.equal(profiles.workspaceTelegramCommandAllowed('report_daily', ['clinic']), true);
});

test('module Telegram summaries preserve legacy Service Centre and respect report selections', async () => {
  let legacy = true, selected, sent = 0, accepted = true;
  const api = load('src/lib/workspaceTelegram.ts', {
    '@/lib/designer/partnerTypesData': { getPartnerType: async () => ({ defaultModules: legacy ? ['service-centre', 'billing'] : ['clinic', 'billing'] }) },
    '@/lib/designer/entitlements': { getVisibleModuleSlugs: async () => { assert.equal(legacy, false); return ['clinic', 'billing']; } },
    '@/lib/workspaceProfiles': profiles,
    '@/lib/workspaceSummary': { loadWorkspaceSummary: async (partner, slugs) => { assert.equal(partner, 'p1'); selected = slugs; return [{ label: 'Clinic', metrics: [{ label: 'Patients', value: 3 }] }]; } },
    '@/lib/telegram': {
      getTelegramSettings: async () => ({ chatId: '123', routing: { 'workspaceModule:billing': 'none' } }),
      sendPartnerTelegramReport: async (id, cadence, message) => { sent++; assert.equal(id, 'p1'); assert.ok(message.includes('&lt;Clinic&gt;')); assert.ok(!message.includes('workorder')); return accepted; },
    },
  });
  const partner = { id: 'p1', partnerTypeId: 'type', businessName: '<Clinic>' };
  assert.equal(await api.sendModuleReportIfApplicable(partner, 'DAILY', new Date()), false);
  assert.equal(sent, 0);
  legacy = false;
  assert.equal(await api.sendModuleReportIfApplicable(partner, 'DAILY', new Date()), true);
  assert.deepEqual(Array.from(selected), ['clinic']);
  accepted = false;
  await assert.rejects(api.sendModuleReportIfApplicable(partner, 'WEEKLY', new Date()), /not accepted/);
});

test('notification updates authorize before reads, reject unavailable modules, and merge only preferences', async () => {
  let authorized = false, writes = 0, query;
  const tx = { telegramSettings: { upsert: async ({ update }) => { assert.equal(Object.keys(update).length, 0); writes++; } }, $executeRaw: async (...args) => { query = args; } };
  const api = load('src/lib/workspaceTelegramActions.ts', {
    'next/cache': { revalidatePath() {} }, 'next/navigation': { redirect() {} },
    '@/lib/prisma': { prisma: { $transaction: async fn => fn(tx) } },
    '@/lib/requirePartnerSession': { requireSessionPartnerId: async () => { if (!authorized) throw new Error('denied'); } },
    '@/lib/tenant': { assertPartnerCanWrite: async () => {} },
    '@/lib/designer/entitlements': { getVisibleModuleSlugs: async () => { assert.equal(authorized, true); return ['clinic']; } },
    '@/lib/workspaceProfiles': profiles, '@/lib/workspaceTelegram': { workspaceReportKey: slug => `workspaceModule:${slug}` },
  });
  const form = new FormData();
  for (const key of ['report', 'subscriptionExpiring', 'generalAnnouncement']) form.set(`routing_${key}`, 'personal');
  form.set('reportModules', 'clinic');
  await assert.rejects(api.saveWorkspaceTelegram('p1', form), /denied/);
  assert.equal(writes, 0);
  authorized = true;
  form.set('reportModules', 'service-centre');
  await assert.rejects(api.saveWorkspaceTelegram('p1', form), /not available/);
  assert.equal(writes, 0);
  form.set('reportModules', 'clinic');
  form.set('routing_newWorkorder', 'none'); // fabricated hidden field must be ignored
  await api.saveWorkspaceTelegram('p1', form);
  assert.equal(writes, 1);
  assert.ok(query[0].join('').includes('||'));
  const patch = JSON.parse(query[1]);
  assert.equal(patch['workspaceModule:clinic'], 'both');
  assert.equal(patch.newWorkorder, undefined);
  assert.equal(query[2], 'p1');
});

test('numbering actions refuse anonymous, cross-tenant and disabled-module writes before persistence', async () => {
  let owner = '', admin = false, active = ['billing'], writes = 0;
  const api = load('src/lib/numberingActions.ts', {
    'next/cache': { revalidatePath() {} }, 'next/headers': { cookies: () => ({ get: () => undefined }) },
    '@/lib/adminAuth': { isValidAdminCookie: async () => admin },
    '@/lib/requirePartnerSession': { requireSessionPartnerId: async id => { if (id !== owner) throw new Error('denied'); } },
    '@/lib/designer/entitlements': { getVisibleModuleSlugs: async () => active },
    '@/lib/workspaceProfiles': profiles,
    '@/lib/designer/numbering': Object.fromEntries(['saveMainScheme', 'savePartnerScheme', 'clearPartnerScheme', 'getNextNumber'].map(name => [name, async () => { writes++; }])),
  });
  await assert.rejects(api.savePartnerSchemeAction('p1', 'invoice.b2c', {}), /denied/);
  owner = 'p2'; await assert.rejects(api.fetchNextNumberAction('invoice.b2c', 'p1'), /denied/);
  owner = 'p1'; await assert.rejects(api.clearPartnerSchemeAction('p1', 'service-centre.workorder'), /not available/);
  await assert.rejects(api.saveMainSchemeAction('invoice.b2c', {}), /Administrator/);
  assert.equal(writes, 0);
  await api.savePartnerSchemeAction('p1', 'invoice.b2c', {});
  active = ['service-centre']; await api.savePartnerSchemeAction('p1', 'service-centre.workorder', {});
  assert.equal(writes, 2);
});

test('workspace document settings never clear hidden Service Centre fields', async () => {
  let active = ['clinic'], data;
  const api = load('src/lib/workspaceSettingsActions.ts', {
    '@/lib/workspacePaymentSettings': load('src/lib/workspacePaymentSettings.ts'),
    'next/cache': { revalidatePath() {} }, 'next/navigation': { redirect() {} },
    '@/lib/requirePartnerSession': { requireSessionPartnerId: async () => {} },
    '@/lib/tenant': { assertPartnerCanWrite: async () => {} },
    '@/lib/designer/entitlements': { getVisibleModuleSlugs: async () => active },
    '@/lib/prisma': { prisma: { partner: { update: async input => { assert.equal(input.where.id, 'p1'); data = input.data; } } } },
  });
  const form = new FormData(); form.set('serviceTerms', 'General terms'); form.set('workorderTerms', 'forged');
  await api.saveWorkspaceConfig('p1', form);
  assert.deepEqual(Object.keys(data), ['serviceTerms']);
  active = ['service-centre'];
  await assert.rejects(api.saveWorkspaceConfig('p1', form), /existing Service Centre/);
});
