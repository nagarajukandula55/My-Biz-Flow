const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');

test('Education denies disabled module and expired-trial writes before creating courses or students', async () => {
  let enabled = false;
  let writable = true;
  let writes = 0;
  const education = load('src/lib/education.ts', {
    '@/lib/prisma': { prisma: { course: { create: async () => { writes++; } }, student: { create: async () => { writes++; } } } },
    '@/lib/withRecordLock': { withRecordLock: async () => {} },
    '@/lib/databaseTransaction': { afterDatabaseCommit: async () => {} },
    '@/lib/tenant': { assertPartnerScope: () => {}, assertPartnerCanWrite: async () => { if (!writable) throw new Error('trial expired'); } },
    '@/lib/recordEntitlement': { assertRecordModuleAccess: async () => { if (!enabled) throw new Error('module disabled'); } },
    '@/lib/telegram': { sendPartnerTelegramAlert: async () => {} },
    '@/lib/partnerData': { getPartner: async () => null },
    '@/lib/telegramTemplates': { educationEnrollmentConfirmedMessage: async () => '' },
    '@/lib/email/moduleEmails': { sendEducationEnrollmentConfirmedEmail: async () => {} },
  });
  await assert.rejects(education.createCourse('p1', { name: 'Course', fee: 100 }), /module disabled/);
  enabled = true;
  writable = false;
  await assert.rejects(education.createStudent('p1', { name: 'Student' }), /trial expired/);
  writable = true;
  await assert.rejects(education.createCourse('p1', { name: 'Course', fee: 1.5 }), /valid paise fee/);
  assert.equal(writes, 0);
});
