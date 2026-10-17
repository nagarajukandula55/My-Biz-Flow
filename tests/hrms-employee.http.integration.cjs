// Local production-build route tests; no real users or deployment credentials.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
if (process.env.MBF_ISOLATED_TEST !== '1' || process.env.DATABASE_URL !== 'postgresql://ci:ci@127.0.0.1:55439/ci') throw Error('Disposable localhost database required');
const prisma = new PrismaClient();
const id = 'employee-http-' + crypto.randomUUID();
const base = 'http://127.0.0.1:3317';
const secret = new TextEncoder().encode('isolated-build-session-secret-at-least-32-characters');
async function main() {
  const { SignJWT } = await import('jose');
  await prisma.partnerType.create({ data: { id, defaultModules: ['hrms'] } });
  await prisma.partner.create({ data: { id, internalKey:id,partnerTypeId:id,businessName:'Isolated HRMS business',city:'Test',state:'Test',pincode:'000000',businessEmail:'test@example.invalid',businessContact:id,loginContact:id,passwordHash:'not-a-login-password',mustChangePassword:false,subscriptionStatus:'Active' } });
  await prisma.moduleAccessKey.create({ data: { partnerId:id,moduleSlug:'hrms',key:id } });
  const employee = await prisma.employee.create({ data: { partnerId:id,name:'Private employee display name' } });
  const staff = await prisma.partnerStaff.create({ data: { partnerId:id,name:employee.name,loginId:'HRE-'+employee.id,role:'HrmsEmployee',passwordHash:'isolated-hash',mustChangePassword:false } });
  const token = await new SignJWT({purpose:'hrms-employee',partnerId:id,staffId:staff.id,employeeId:employee.id,version:crypto.createHash('sha256').update(staff.passwordHash).digest('hex')}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('10m').sign(secret);
  const cookie = `mbf_hrms_employee=${token}`;
  const request = (path, value='') => fetch(base+path,{headers:{cookie:value},redirect:'manual'});
  let res = await request(`/partner/${id}/hrms/employee`);
  assert.equal(res.status,200);let html=await res.text();assert.ok(html.includes('Employee login ID'));assert.ok(!html.includes(employee.name));
  res = await request(`/partner/${id}/hrms/employee`,cookie);
  assert.equal(res.status,200);html=await res.text();assert.ok(html.includes(employee.name));assert.ok(html.includes('Check in'));assert.ok(!html.includes('"digest":'));
  for(const path of ['dashboard','hrms','hrms/employee-access']) {
    res=await request(`/partner/${id}/${path}`,cookie);assert.equal(res.status,307,path);assert.equal(res.headers.get('location'),'/login',path);
  }
  res=await request(`/partner/foreign-business/hrms/employee`,cookie);html=await res.text();assert.ok(html.includes('Employee login ID'));assert.ok(!html.includes(employee.name));
  res=await request(`/partner/${id}/hrms/employee/manifest.webmanifest`);assert.equal(res.status,200);assert.equal((await res.json()).start_url,`/partner/${id}/hrms/employee`);
  await prisma.partnerStaff.update({where:{id:staff.id},data:{mustChangePassword:true}});
  res=await request(`/partner/${id}/hrms/employee`,cookie);html=await res.text();assert.ok(html.includes('Replace your temporary password'));assert.ok(!html.includes('>Check in<'));
  await prisma.partnerStaff.update({where:{id:staff.id},data:{status:'Suspended'}});
  res=await request(`/partner/${id}/hrms/employee`,cookie);html=await res.text();assert.ok(html.includes('Employee login ID'));assert.ok(!html.includes(employee.name));
  console.log('Employee portal, forced password replacement, private identity, cross-business isolation, owner-route denial, session revocation and install manifest passed.');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  await prisma.partnerStaff.deleteMany({where:{partnerId:id}});await prisma.employee.deleteMany({where:{partnerId:id}});
  await prisma.moduleAccessKey.deleteMany({where:{partnerId:id}});await prisma.partner.deleteMany({where:{id}});await prisma.partnerType.deleteMany({where:{id}});await prisma.$disconnect();
});
