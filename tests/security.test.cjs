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


test('telecalling binds staff identity and queue access, with owner-only management', async () => {
  let owner, admin = false;
  let session = { partnerId: 'p1', staffId: 'a1' };
  let agent = { id: 'a1', status: 'Active', role: 'Telecaller', assignedStates: ['KA'], assignedCities: [] };
  let lead = { assignedToId: 'a1', state: 'KA', city: null };
  const auth = load('src/lib/telecalling/authorization.ts', {
    'next/headers': { cookies: () => ({ get: () => undefined }) },
    '@/lib/adminAuth': { ADMIN_COOKIE_NAME: 'admin', isValidAdminCookie: async () => admin },
    '@/lib/requirePartnerSession': { getSessionPartnerId: async () => owner, getStaffSession: async () => session, PartnerAuthorizationError: Error },
    '@/lib/partnerStaff': { getPartnerStaff: async () => agent },
    '@/lib/telecalling/leadsData': { getLead: async () => lead },
  });
  await assert.rejects(auth.requireTelecallingManager('p1'), /Only the partner owner/);
  await assert.rejects(auth.requireTelecallingActor('p1', 'lead', 'a2'), /identity/);
  await assert.rejects(auth.requireTelecallingActor('p2', 'lead', 'a1'), /identity/);
  assert.equal(await auth.requireTelecallingActor('p1', 'lead', 'a1'), 'a1');
  lead.assignedToId = 'a2';
  await assert.rejects(auth.requireTelecallingActor('p1', 'lead', 'a1'), /outside/);
  lead.assignedToId = null;
  assert.equal(await auth.requireTelecallingActor('p1', 'lead', 'a1'), 'a1');
  lead.state = 'TN';
  await assert.rejects(auth.requireTelecallingActor('p1', 'lead', 'a1'), /outside/);
  agent.status = 'Suspended';
  await assert.rejects(auth.requireTelecallingActor('p1', 'lead', 'a1'), /active telecaller/);
  agent.status = 'Active'; agent.role = 'Technician';
  await assert.rejects(auth.requireTelecallingActor('p1', 'lead', 'a1'), /active telecaller/);
  owner = 'p1'; agent.role = 'Telecaller';
  assert.equal(await auth.requireTelecallingManager('p1'), 'p1');
  assert.equal(await auth.requireTelecallingActor('p1', 'lead', 'a1'), 'a1');
});


test('call logging validates the actor and keeps call/status writes in one transaction', async () => {
  let active = false, failUpdate = false, committed = [], staged = [];
  const lead = { id: 'l1', partnerId: 'p1', phone: '123', name: 'Lead' };
  const tx = {
    lead: { findUniqueOrThrow: async () => lead, update: async () => { if (failUpdate) throw new Error('update failed'); staged.push('status'); } },
    partnerStaff: { findFirst: async ({ where }) => { assert.equal(where.partnerId, 'p1'); assert.equal(where.status, 'Active'); return active ? { id: 'a1' } : null; } },
    call: { create: async ({ data }) => { staged.push('call'); return { ...data, agent: { name: 'Agent' } }; } },
  };
  const calls = load('src/lib/telecalling/callsData.ts', {
    '@/lib/prisma': { prisma: { $transaction: async fn => { staged = []; const result = await fn(tx); committed.push(...staged); return result; } } },
    '@/lib/tenant': { assertPartnerScope: (a, b) => assert.equal(a, b) },
    '@/lib/whatsapp': {}, '@/lib/whatsappTriggers': { isWhatsappTriggerEnabled: async () => false }, '@/lib/seo': { SITE_URL: 'https://example.invalid' },
  });
  const input = { leadId: 'l1', agentId: 'a1', outcome: 'Interested' };
  await assert.rejects(calls.logCall('p1', { ...input, outcome: 'invalid' }), /Invalid call/);
  await assert.rejects(calls.logCall('p1', input), /active telecaller/);
  assert.deepEqual(committed, []);
  active = true; failUpdate = true;
  await assert.rejects(calls.logCall('p1', input), /update failed/);
  assert.deepEqual(committed, []);
  failUpdate = false;
  await calls.logCall('p1', input);
  assert.deepEqual(committed, ['call', 'status']);
});
