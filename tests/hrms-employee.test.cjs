const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const load = require('./loadModule.cjs');

test('employee credentials enforce tenant/role boundaries, forced replacement, revocation and throttling', async () => {
  const jose = await import('jose');
  const passwords = load('src/lib/passwords.ts', { crypto });
  const jar = new Map(), accounts = [], attempts = new Map();
  let owner = true, moduleEnabled = true, employeeActive = true;
  const matches = (row, where) => Object.entries(where).every(([key, value]) => row[key] === value);
  const employee = { id: 'employee1', partnerId: 'A', name: 'Employee', status: 'Active' };
  const prisma = {
    employee: { findFirst: async ({where}) => matches({...employee,status:employeeActive?'Active':'Terminated'},where) ? {...employee,status:employeeActive?'Active':'Terminated'} : null },
    partnerStaff: {
      findFirst: async ({where}) => accounts.find(row=>matches(row,where)) ?? null,
      create: async ({data}) => { const row={id:'staff'+accounts.length,...data};accounts.push(row);return row; },
      update: async ({where,data}) => { const row=accounts.find(row=>matches(row,where));assert.ok(row);Object.assign(row,data);return row; },
    },
    businessRecord: {
      findUnique: async ({where}) => attempts.get(JSON.stringify(where)),
      upsert: async ({where,create,update}) => { const k=JSON.stringify(where);attempts.set(k,attempts.has(k)?update:create); },
    },
  };
  const secret = 'isolated-employee-auth-test-secret-32-characters';
  const api = load('src/lib/hrmsEmployeeAccess.ts', {
    'node:crypto':crypto, jose, 'next/headers':{cookies:()=>({get:k=>jar.has(k)?{value:jar.get(k)}:undefined,set:(k,v)=>jar.set(k,v)})},
    '@/lib/prisma':{prisma}, '@/lib/env':{env:{partnerSessionSecret:()=>secret}}, '@/lib/passwords':passwords,
    '@/lib/withRecordLock':{withRecordLock:async(s,k,fn)=>fn()},
    '@/lib/tenant':{assertModuleAccess:async()=>{if(!moduleEnabled)throw Error('module disabled');},assertPartnerCanWrite:async()=>{}},
    '@/lib/requirePartnerSession':{requireSessionPartnerId:async()=>{if(!owner)throw Error('owner required');}},
  },{TextEncoder,process:{env:{NODE_ENV:'test'}}});
  owner=false;await assert.rejects(api.issueEmployeeAccess('A','employee1'),/owner/);owner=true;
  await assert.rejects(api.issueEmployeeAccess('B','employee1'),/active employee/);
  const issued=await api.issueEmployeeAccess('A','employee1');
  assert.equal(accounts[0].role,'HrmsEmployee');assert.equal(accounts.length,1);
  assert.equal(await api.loginEmployee('B',issued.loginId,issued.password),false);
  assert.equal(await api.loginEmployee('A',issued.loginId,issued.password),true);
  assert.equal(await api.getEmployeeSession('A'),null);
  assert.equal((await api.getEmployeeSession('A',true)).employee.id,'employee1');
  await assert.rejects(api.changeEmployeePassword('A',issued.password,issued.password),/different/);
  await api.changeEmployeePassword('A','New-password-12345','New-password-12345');
  assert.equal((await api.getEmployeeSession('A')).employee.id,'employee1');
  assert.equal(await api.getEmployeeSession('B'),null);
  const cookie=jar.get(api.EMPLOYEE_COOKIE);
  moduleEnabled=false;assert.equal(await api.getEmployeeSession('A'),null);moduleEnabled=true;
  employeeActive=false;assert.equal(await api.getEmployeeSession('A'),null);employeeActive=true;
  accounts[0].role='Technician';assert.equal(await api.getEmployeeSession('A'),null);accounts[0].role='HrmsEmployee';
  jar.set(api.EMPLOYEE_COOKIE,cookie.slice(0,-5)+'xxxxx');assert.equal(await api.getEmployeeSession('A'),null);
  jar.set(api.EMPLOYEE_COOKIE,await new jose.SignJWT({partnerId:'A',staffId:'staff0',employeeId:'employee1',purpose:'staff-session'}).setProtectedHeader({alg:'HS256'}).setExpirationTime('1h').sign(new TextEncoder().encode(secret)));
  assert.equal(await api.getEmployeeSession('A'),null);
  jar.set(api.EMPLOYEE_COOKIE,cookie);
  const reset=await api.issueEmployeeAccess('A','employee1');assert.equal(await api.getEmployeeSession('A',true),null);
  assert.equal(await api.loginEmployee('A',reset.loginId,reset.password),true);
  await api.issueEmployeeAccess('A','employee1',true);assert.equal(await api.getEmployeeSession('A',true),null);
  const again=await api.issueEmployeeAccess('A','employee1');
  for(let i=0;i<5;i++)assert.equal(await api.loginEmployee('A',again.loginId,'incorrect'),false);
  assert.equal(await api.loginEmployee('A',again.loginId,again.password),false);
  assert.equal(attempts.size,1);
});

test('employee punches derive identity from the session and reject stale or inaccurate locations', async()=>{
  const location=load('src/lib/attendanceLocation.ts');
  const good={lat:12,lng:77,accuracy:20,capturedAt:Date.now()};
  assert.equal(location.validateAttendanceLocation(good),null);
  for(const patch of [{accuracy:101},{accuracy:-1},{lat:91},{lng:NaN},{capturedAt:Date.now()-61000},{capturedAt:Date.now()+11000}])assert.ok(location.validateAttendanceLocation({...good,...patch}));
  let session=null,calls=[];
  const actions=load('src/app/partner/[partnerId]/hrms/employee/actions.ts',{
    'next/headers':{cookies:()=>({delete(){}})},'next/cache':{revalidatePath(){}},
    '@/lib/hrmsEmployeeAccess':{getEmployeeSession:async id=>id==='A'?session:null},
    '@/lib/hrms':{checkIn:async(...args)=>{calls.push(args);return {ok:true};},checkOut:async(...args)=>{calls.push(args);return {ok:true};}},
    '@/lib/attendanceLocation':location,
  });
  assert.equal((await actions.employeePunchAction('A','in',good)).ok,false);
  session={employee:{id:'signed-in-employee'}};
  assert.equal((await actions.employeePunchAction('B','in',good)).ok,false);
  assert.equal((await actions.employeePunchAction('A','in',{...good,accuracy:999})).ok,false);
  assert.equal(calls.length,0);
  assert.equal((await actions.employeePunchAction('A','in',{...good,employeeId:'someone-else'})).ok,true);
  assert.deepEqual(calls[0],['A','signed-in-employee',12,77]);
});
