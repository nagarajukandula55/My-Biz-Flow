// Starts only a loopback app with synthetic credentials; never loads deployment .env files.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const url = 'postgresql://ci:ci@127.0.0.1:55439/ci';
if (process.env.MBF_ISOLATED_TEST !== '1' || process.env.DATABASE_URL !== url || (process.env.DATABASE_URL_UNPOOLED && process.env.DATABASE_URL_UNPOOLED !== url)) throw Error('Explicit disposable loopback database required.');
const app = path.resolve(process.env.MBF_TEST_APP_DIR || root);
if (![root, path.join(root, '.local-test-db', 'workspace-readiness-build')].includes(app)) throw Error('Unsupported app directory.');
if (fs.readdirSync(app).some(name => /^\.env($|\.)/.test(name) && name !== '.env.example')) throw Error('Refusing a directory with deployment environment files. Use the isolated build copy.');
if (!fs.existsSync(path.join(app, '.next', 'BUILD_ID'))) throw Error('Build the isolated application first.');
const env = Object.fromEntries(['PATH','Path','SystemRoot','SYSTEMROOT','WINDIR','windir','TEMP','TMP','HOME','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC','ComSpec','SystemDrive'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
Object.assign(env, { NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', MBF_ISOLATED_TEST: '1', DATABASE_URL: url, DATABASE_URL_UNPOOLED: url, SUPER_ADMIN_SECRET: 'isolated-build-secret', PARTNER_SESSION_SECRET: 'isolated-build-session-secret-at-least-32-characters', CENTRAL_API_URL: 'https://example.invalid', CENTRAL_API_KEY: 'isolated' });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let server, serverClosed, serverError;
async function checkPort() {
  await new Promise((resolve,reject) => {
    const probe = net.createServer();
    probe.once('error', () => reject(Error('Port 3317 is already in use. Refusing to test an unknown server.')));
    probe.listen(3317,'127.0.0.1',()=>probe.close(resolve));
  });
}
async function run(file) {
  await new Promise((resolve,reject) => {
    const child = spawn(process.execPath,[path.join(root,file)],{cwd:root,env,stdio:'inherit',windowsHide:true});
    child.once('error',reject);
    child.once('exit',code=>code===0?resolve():reject(Error(`${file} failed (${code}).`)));
  });
}
async function main() {
  await checkPort();
  server = spawn(process.execPath,[path.join(root,'node_modules','next','dist','bin','next'),'start','-H','127.0.0.1','-p','3317'],{cwd:app,env,stdio:'inherit',windowsHide:true});
  serverClosed = new Promise(resolve=>server.once('exit',resolve));
  server.on('error',error=>{serverError=error;});
  let ready=false;
  for(let attempt=0;attempt<30;attempt++) {
    if(serverError) throw serverError;
    if(server.exitCode!==null) throw Error('The isolated server exited before becoming ready.');
    try { const response=await fetch('http://127.0.0.1:3317/login',{signal:AbortSignal.timeout(1500)}); if(response.status===200){ready=true;break;} } catch {}
    await pause(1000);
  }
  if(!ready) throw Error('The isolated server did not become ready.');
  for(const file of ['tests/workspace.http.integration.cjs','tests/hrms-employee.http.integration.cjs','tests/business-pages.http.integration.cjs','tests/service-centre.http.integration.cjs']) await run(file);
  console.log('Isolated HTTP acceptance passed. This does not deploy or certify production readiness.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(async()=>{
  if(server && server.exitCode===null) { server.kill(); await Promise.race([serverClosed,pause(5000)]); }
});
