const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');

test('Real Estate denies invalid stage, foreign property, and expired trial before enquiry writes', async () => {
  let writes = 0;
  let writable = true;
  const data = load('src/lib/realEstateData.ts', {
    '@/lib/prisma': { prisma: {
      property: { findUnique: async () => ({ id: 'other', partnerId: 'p2' }) },
      enquiry: { create: async () => { writes++; } },
    } },
    '@/lib/tenant': {
      assertPartnerScope: (requested, actual) => { if (requested !== actual) throw new Error('wrong tenant'); },
      assertPartnerCanWrite: async () => { if (!writable) throw new Error('trial expired'); },
    },
    '@/lib/recordEntitlement': { assertRecordModuleAccess: async () => {} },
    '@/lib/realEstateStages': load('src/lib/realEstateStages.ts'),
  });
  await assert.rejects(data.createEnquiry('p1', { stage: 'Unknown' }), /valid enquiry stage/);
  await assert.rejects(data.createEnquiry('p1', { propertyId: 'other' }), /wrong tenant/);
  writable = false;
  await assert.rejects(data.createEnquiry('p1', {}), /trial expired/);
  assert.equal(writes, 0);
});

test('Site visit rejects malformed windows before conflict reads or writes', async () => {
  let reads = 0;
  let writes = 0;
  const actions = load('src/app/partner/[partnerId]/real-estate/[recordId]/actions.ts', {
    'next/cache': { revalidatePath: () => {} },
    'next/navigation': { redirect: () => {} },
    '@/lib/requirePartnerSession': { requireSessionPartnerId: async id => id },
    '@/lib/realEstateData': {
      getEnquiry: async () => { reads++; return { stage: 'New' }; },
      listEnquiries: async () => { reads++; return []; },
      patchEnquiryLifecycle: async () => { writes++; },
    },
    '@/lib/withRecordLock': { withRecordLock: async (_scope, _key, fn) => fn() },
  });
  const result = await actions.scheduleSiteVisitAction('p1', 'e1', 'Agent', 'Agent', 'bad', '2027-01-02');
  assert.equal(result.ok, false);
  assert.equal(reads, 0);
  assert.equal(writes, 0);
  const invalidStage = await actions.updateLeadStageAction('p1', 'e1', 'Unknown');
  assert.equal(invalidStage.ok, false);
  assert.equal(writes, 0);
});
