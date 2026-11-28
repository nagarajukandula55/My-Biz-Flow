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
  let pathname = '/partner/partner-1/billing';
  const access = load('src/lib/moduleTemplateAccess.ts', {
    '@/lib/designer/entitlements': { getVisibleModuleSlugs: async partnerId => {
      assert.equal(partnerId, 'partner-1');
      return enabled;
    } },
    'next/headers': { headers: () => ({ get: () => pathname }) },
    'next/navigation': { notFound: () => { throw new Error('404'); } },
  });
  const route = load(file, {
    '@/lib/moduleTemplateAccess': access,
  });
  // Next.js 14 only supplies children to templates. The path comes from middleware.
  await assert.rejects(route.default({ children: 'content' }), /404/);
  enabled = ['billing'];
  assert.equal(await route.default({ children: 'content' }), 'content');
  pathname = '/partner/partner-1/service-centre';
  await assert.rejects(route.default({ children: 'content' }), /404/);
  pathname = null;
  await assert.rejects(route.default({ children: 'content' }), /404/);

  const moduleSlugs = ['pos','billing','brand','clinic','amc-field-service','subscriptions','real-estate','rentals','education','manufacturing','interior-design','wholesale-b2b','logistics-fleet','legal','event-booking','salon-spa','telecalling','inventory','accounting-gst','accounting','loyalty-rewards','hrms','marketplace','field-force'];
  for (const slug of moduleSlugs) {
    assert.ok(fs.existsSync(`src/app/partner/[partnerId]/${slug}/template.tsx`), `${slug} has a route gate`);
  }
});
