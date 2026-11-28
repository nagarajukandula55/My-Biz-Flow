const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const load = require('./loadModule.cjs');

test('record partitions resolve to their owning module and reject disabled writes', async () => {
  let enabled = ['accounting'];
  const access = load('src/lib/recordEntitlement.ts', {
    '@/lib/designer/modules': { MODULES: [{ slug: 'accounting' }, { slug: 'accounting-gst' }, { slug: 'inventory' }] },
    '@/lib/designer/entitlements': { getVisibleModuleSlugs: async () => enabled },
    '@/lib/tenant': { ModuleAccessError: Error },
  });
  assert.equal(access.moduleForRecordPartition('accounting-gst-returns'), 'accounting-gst');
  assert.equal(access.moduleForRecordPartition('inventory-bom'), 'inventory');
  assert.equal(access.moduleForRecordPartition('platform-settings'), null);
  await assert.rejects(access.assertRecordModuleAccess('partner-1', 'accounting-gst-returns'), /denied/);
  enabled = ['accounting-gst', 'inventory'];
  await access.assertRecordModuleAccess('partner-1', 'accounting-gst-returns');
  await access.assertRecordModuleAccess('partner-1', 'inventory-bom');
});

test('module route templates deny a revoked module on direct and client navigation', async () => {
  const file = 'src/app/partner/[partnerId]/billing/template.tsx';
  let enabled = [];
  const route = load(file, {
    '@/lib/designer/entitlements': { getVisibleModuleSlugs: async () => enabled },
    'next/navigation': { notFound: () => { throw new Error('404'); } },
  });
  await assert.rejects(route.default({ children: 'content', params: { partnerId: 'partner-1' } }), /404/);
  enabled = ['billing'];
  assert.equal(await route.default({ children: 'content', params: { partnerId: 'partner-1' } }), 'content');

  const moduleSlugs = ['pos','billing','brand','clinic','amc-field-service','subscriptions','real-estate','rentals','education','manufacturing','interior-design','wholesale-b2b','logistics-fleet','legal','event-booking','salon-spa','telecalling','inventory','accounting-gst','accounting','loyalty-rewards','hrms','marketplace','field-force'];
  for (const slug of moduleSlugs) {
    assert.ok(fs.existsSync(`src/app/partner/[partnerId]/${slug}/template.tsx`), `${slug} has a route gate`);
  }
});
