const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');

test('Legal rejects disabled or expired writes and cross-tenant client replacement', async () => {
  let writes = 0;
  let enabled = false;
  let writable = true;
  const legal = load('src/lib/legal.ts', {
    '@/lib/prisma': { prisma: {
      legalClient: { create: async () => { writes++; }, findFirst: async () => null },
      legalMatter: { findUniqueOrThrow: async () => ({ partnerId: 'p1', status: 'Open' }), update: async () => { writes++; } },
    } },
    '@/lib/telegram': { sendPartnerTelegramAlert: async () => {} },
    '@/lib/businessRecords': { createBusinessRecord: async () => {}, listBusinessRecords: async () => [] },
    '@/lib/tenant': { assertPartnerScope: () => {}, assertPartnerCanWrite: async () => { if (!writable) throw new Error('trial expired'); } },
    '@/lib/recordEntitlement': { assertRecordModuleAccess: async () => { if (!enabled) throw new Error('module disabled'); } },
    '@/lib/databaseTransaction': { afterDatabaseCommit: async () => {} },
    '@/lib/designer/numbering': { getNextNumber: async () => 'MTR-1' },
    '@/lib/partnerData': { getPartner: async () => null },
    '@/lib/telegramTemplates': { legalMatterStatusChangedMessage: async () => '' },
    '@/lib/email/moduleEmails': { sendLegalMatterStatusChangedEmail: async () => {} },
    '@/lib/legalShared': load('src/lib/legalShared.ts'),
  });
  await assert.rejects(legal.createLegalClient('p1', { name: 'Client' }), /module disabled/);
  enabled = true;
  writable = false;
  await assert.rejects(legal.addLegalCourtDate('p1', 'm1', { hearingDate: '2027-01-01' }), /trial expired/);
  writable = true;
  await assert.rejects(legal.updateLegalMatter('p1', 'm1', { clientId: 'foreign' }), /not found for this business/);
  assert.equal(writes, 0);
});
