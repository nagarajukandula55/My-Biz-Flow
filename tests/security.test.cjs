const assert = require('node:assert/strict');
const test = require('node:test');
const load = require('./loadModule.cjs');
const policy = load('src/lib/cronAuthorization.ts');

test('cron rejects absent, empty and incorrect secrets', () => {
  for (const secret of [undefined, '', '   ']) {
    assert.equal(policy.isAuthorizedCronRequest(null, secret), false);
    assert.equal(policy.isAuthorizedCronRequest(`Bearer ${secret}`, secret), false);
  }
  assert.equal(policy.isAuthorizedCronRequest('Bearer expected', 'expected'), true);
  assert.equal(policy.isAuthorizedCronRequest('Bearer other', 'expected'), false);
});

for (const name of ['billing-recurring-invoices', 'subscription-expiry-check', 'telegram-reports']) {
  test(`${name} rejects unauthorized requests before business operations`, async () => {
    const denied = () => { throw new Error('Business operation executed'); };
    const mocks = {
      'next/server': { NextResponse: { json: (body, options) => ({ body, ...options }) } },
      '@/lib/env': { env: { cronSecret: () => undefined } },
      '@/lib/cronAuthorization': policy,
    };
    for (const name of ['partnerData','businessRecords','sample-data/billing-recurring','centralApi','telegram','platformSettings','telegramTemplates','telegramReportData','telegramReportRunner']) {
      mocks[`@/lib/${name}`] = new Proxy({}, { get: () => denied });
    }
    const route = load(`src/app/api/cron/${name}/route.ts`, mocks);
    const response = await route.GET(new Request('http://test.invalid', { headers: { authorization: 'Bearer undefined' } }));
    assert.equal(response.status, 401);
  });
}

test('staff mutations reject suspended, missing and cross-partner staff', async () => {
  let staff = { status: 'Suspended' };
  let claims = { partnerId: 'SC0001', staffId: 'staff-1' };
  const gate = load('src/lib/requirePartnerSession.ts', {
    'next/headers': { cookies: () => ({ get: () => ({ value: 'signed-test-token' }) }) },
    'next/navigation': { redirect: () => { throw new Error('redirect'); } },
    '@/lib/partnerSession': { verifyPartnerSessionToken: async () => undefined, verifyStaffSessionToken: async () => claims },
    '@/lib/adminAuth': { isValidAdminCookie: async () => false },
    '@/lib/partnerStaff': { getPartnerStaff: async (partnerId, staffId) => {
      assert.equal(partnerId, claims.partnerId); assert.equal(staffId, claims.staffId); return staff;
    } },
  });
  await assert.rejects(gate.requireSessionOrStaffPartnerId('SC0001'));
  staff = undefined;
  await assert.rejects(gate.requireSessionOrStaffPartnerId('SC0001'));
  staff = { status: 'Active' };
  assert.equal(await gate.requireSessionOrStaffPartnerId('SC0001'), 'SC0001');
  await assert.rejects(gate.requireSessionOrStaffPartnerId('SC0002'));
});
