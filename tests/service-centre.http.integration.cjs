// Synthetic fixtures only, against the isolated production-build server.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
if (process.env.MBF_ISOLATED_TEST !== '1' || process.env.DATABASE_URL !== 'postgresql://ci:ci@127.0.0.1:55439/ci') throw Error('Disposable local database required');
const prisma = new PrismaClient();
const id = 'sc-http-' + crypto.randomUUID();
const planIds = [id + '-starter', id + '-pro', id + '-ultimate'];
const base = 'http://127.0.0.1:3317';

async function main() {
  await prisma.plan.createMany({ data: planIds.map((planId, index) => ({ id: planId, name: 'Synthetic SC tier ' + index, price: 100 * (index + 1), billingCycle: 'monthly', includedModuleSlugs: ['service-centre'], maxUsers: 1, maxLocations: 1, isPublic: false })) });
  await prisma.partnerType.create({ data: { id, defaultModules: ['service-centre'], planIds } });
  await prisma.partner.create({ data: { id, internalKey: id, partnerTypeId: id, planId: planIds[1], businessName: 'Synthetic SC', city: 'Test', state: 'Test', pincode: '000000', businessEmail: 'sc-test@example.invalid', businessContact: id, loginContact: id, passwordHash: 'not-a-login-password', mustChangePassword: false, subscriptionStatus: 'Active' } });
  await prisma.moduleAccessKey.create({ data: { partnerId: id, moduleSlug: 'service-centre', key: id } });
  await prisma.businessRecord.createMany({ data: ['service-centre-inquiry', 'service-centre-customers'].flatMap(moduleSlug => Array.from({ length: 52 }, (_, index) => ({ partnerId: id, moduleSlug, recordKey: 'synthetic-' + index, createdAt: new Date(Date.UTC(2030, 0, 1, 0, 0, index)), data: moduleSlug === 'service-centre-inquiry' ? { customerName: 'SCINQUIRYMARKER' + index + 'END', customerPhone: '0000000000', status: 'Open' } : { name: 'SCCUSTOMERMARKER' + index + 'END', phone: '0000000000', status: 'Active' } }))) });
  const { SignJWT } = await import('jose');
  const token = await new SignJWT({ partnerId: id }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('10m').sign(new TextEncoder().encode('isolated-build-session-secret-at-least-32-characters'));
  const headers = { cookie: 'mbf_partner_session=' + token };
  async function html(route) {
    const response = await fetch(`${base}/partner/${id}/service-centre/${route}`, { headers, redirect: 'manual' });
    const body = await response.text();
    assert.equal(response.status, 200, route);
    assert.ok(!body.includes('"digest":') && !body.includes('NEXT_REDIRECT'), route + ': render failure');
    return body;
  }
  for (const page of ['Infinity', '1.5', '-1', 'not-a-page', '999999']) {
    const body = await html('inquiries?page=' + page);
    const markers = new Set(body.match(/SCINQUIRYMARKER\d+END/g) || []);
    assert.equal(markers.size, page === '999999' ? 2 : 25, 'bounded inquiry page ' + page);
    assert.ok(markers.has(page === '999999' ? 'SCINQUIRYMARKER0END' : 'SCINQUIRYMARKER51END'));
  }
  const locked = await html('customers?page=Infinity');
  assert.ok(locked.includes('Customer data is protected'));
  assert.ok(!locked.includes('SCCUSTOMERMARKER'));
  // Set only this synthetic tenant's existing OTP state; no Telegram delivery is invoked.
  await prisma.customerDataAccessOtp.create({ data: { partnerId: id, codeHash: 'synthetic-unused', expiresAt: new Date(), verifiedUntil: new Date(Date.now() + 60000) } });
  for (const page of ['1.5', '999999']) {
    const body = await html('customers?page=' + page);
    const markers = new Set(body.match(/SCCUSTOMERMARKER\d+END/g) || []);
    assert.equal(markers.size, page === '999999' ? 2 : 25, 'bounded customer page ' + page);
  }
  await prisma.customerDataAccessOtp.update({ where: { partnerId: id }, data: { verifiedUntil: new Date(0) } });
  assert.ok((await html('customers')).includes('Customer data is protected'), 'expired OTP relocks page');
  console.log('Service Centre: malformed/stale pagination bounded; full lists absent from page payload; customer OTP lock/unlock/expiry preserved');
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await prisma.customerDataAccessOtp.deleteMany({ where: { partnerId: id } });
  await prisma.businessRecord.deleteMany({ where: { partnerId: id } });
  await prisma.moduleAccessKey.deleteMany({ where: { partnerId: id } });
  await prisma.partner.deleteMany({ where: { id } });
  await prisma.partnerType.deleteMany({ where: { id } });
  await prisma.plan.deleteMany({ where: { id: { in: planIds } } });
  await prisma.$disconnect();
});
