// Exercises pg_dump/pg_restore on two newly created databases with synthetic data only.
// Never reads .env, restores into ci, or reuses an existing restore database.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const allowed = 'postgresql://ci:ci@127.0.0.1:55439/ci';
if (process.env.MBF_ISOLATED_TEST !== '1' || process.env.DATABASE_URL !== allowed || (process.env.DATABASE_URL_UNPOOLED && process.env.DATABASE_URL_UNPOOLED !== allowed)) throw Error('Explicit disposable localhost ci database required.');
const root = path.resolve(__dirname, '..', '.local-test-db'), bin = path.join(root,'runtime','pgsql','bin');
const suffix = crypto.randomBytes(8).toString('hex');
const source = `mbf_rehearsal_source_${suffix}`, target = `mbf_rehearsal_restore_${suffix}`;
const created = new Set();
const archive = path.join(root, `synthetic-${suffix}.dump`);
const env = { ...process.env, PGHOST:'127.0.0.1', PGHOSTADDR:'127.0.0.1', PGPORT:'55439', PGUSER:'ci', PGPASSWORD:'ci', PGDATABASE:'ci', PGSERVICE:'', PGSERVICEFILE:'', PGOPTIONS:'' };
delete env.PGSERVICE;delete env.PGSERVICEFILE;
function run(tool,args,input) {
  const result=spawnSync(path.join(bin,`${tool}.exe`),args,{encoding:'utf8',windowsHide:true,env,input,timeout:60000});
  if (result.error || result.status!==0) throw Error(`${tool} failed: ${result.error?.message ?? result.stderr}`);
  return result.stdout.trim();
}
function sql(database,statement) { return run('psql',['-X','-q','-t','-A','-v','ON_ERROR_STOP=1','-d',database],statement); }
function create(name) {
  if (!/^mbf_rehearsal_(source|restore)_[a-f0-9]{16}$/.test(name)) throw Error('Invalid disposable database name.');
  // CREATE deliberately fails on a collision; it never drops/reuses an existing database.
  sql('ci',`CREATE DATABASE "${name}" TEMPLATE template0;`);created.add(name);
}
function digest(database) {
  return sql(database,`SELECT json_build_object('parents',(SELECT count(*) FROM synthetic_partners),'entries',(SELECT count(*) FROM synthetic_entries),'parentChecksum',(SELECT md5(string_agg(row_to_json(p)::text,'|' ORDER BY p.id)) FROM synthetic_partners p),'checksum',(SELECT md5(string_agg(row_to_json(e)::text,'|' ORDER BY e.id)) FROM synthetic_entries e))::text;`);
}
let failure;
try {
  const directory=sql('ci','SHOW data_directory;');
  if (path.resolve(directory).toLowerCase()!==path.join(root,'data').toLowerCase()) throw Error('Unexpected cluster directory; refusing rehearsal.');
  create(source);create(target);
  sql(source,`CREATE TABLE synthetic_partners (id text PRIMARY KEY, name text NOT NULL);
CREATE TABLE synthetic_entries (id integer PRIMARY KEY, partner_id text NOT NULL REFERENCES synthetic_partners(id), amount_paise integer NOT NULL CHECK(amount_paise>=0), data jsonb NOT NULL);
INSERT INTO synthetic_partners VALUES ('tenant-a','Synthetic A'),('tenant-b','Synthetic B');
INSERT INTO synthetic_entries VALUES (1,'tenant-a',100000,'{"module":"hotel","status":"Confirmed"}'),(2,'tenant-a',75000,'{"module":"rentals","receipt":"synthetic-only"}'),(3,'tenant-b',12500,'{"module":"hrms","notes":"Unicode ₹ retained"}');`);
  const expected=digest(source);
  run('pg_dump',['-Fc','--no-owner','--no-acl','-d',source,'-f',archive]);
  run('pg_restore',['--exit-on-error','--single-transaction','--no-owner','--no-acl','-d',target,archive]);
  const actual=digest(target);
  if (actual!==expected) throw Error('Restored count/checksum mismatch.');
  const constraints=sql(target,"SELECT count(*) FROM pg_constraint WHERE conrelid='synthetic_entries'::regclass AND contype IN ('p','f','c');");
  if(constraints!=='3')throw Error('Restored constraints are incomplete.');
  console.log(JSON.stringify({ok:true,...JSON.parse(actual),constraints:3,scope:'Synthetic schema/data dump and restore only; no production backup, application recovery or provider recovery verified.'}));
} catch(error) {failure=error;}
finally {
  for(const database of [...created].reverse()) {
    try { sql('ci',`DROP DATABASE "${database}";`); } catch(error) {failure ??= error;}
  }
  if(fs.existsSync(archive))fs.unlinkSync(archive);
}
if(failure){console.error(failure.message);process.exitCode=1;}
