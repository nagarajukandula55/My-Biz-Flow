// Data-only rehearsal. Never accepts a production URL or executes dump SQL/DDL.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const url = 'postgresql://ci:ci@127.0.0.1:55439/mbf_restore_20260930';
if (process.env.MBF_ISOLATED_TEST !== '1' || process.env.DATABASE_URL !== url) {
  throw new Error('Only the explicitly named disposable local restore database is allowed.');
}
const root = path.resolve(__dirname, '..', '.local-test-db');
const source = path.join(root, 'restore-source');
const prisma = new PrismaClient({ datasources: { db: { url } } });
const identifier = /^(?:[a-z_][a-z_0-9]*|"[A-Za-z_][A-Za-z_0-9]*")$/;
const unquote = value => value.replace(/^"|"$/g, '');
async function main() {
  const [{ data_directory }] = await prisma.$queryRawUnsafe('SHOW data_directory');
  if (path.resolve(data_directory).toLowerCase() !== path.join(root, 'data').toLowerCase()) {
    throw new Error('Unexpected local cluster; refusing restore.');
  }
  // This table belongs only to the sibling Admin Prisma model.
  await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS public.admin_audit_logs (id TEXT PRIMARY KEY, action TEXT NOT NULL, "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL, detail TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  const columns = await prisma.$queryRawUnsafe("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'");
  const tables = new Map();
  for (const { table_name, column_name } of columns) {
    if (!tables.has(table_name)) tables.set(table_name, new Set());
    tables.get(table_name).add(column_name);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(source, 'manifest-20260929-163325.json'), 'utf8'));
  const dump = fs.readFileSync(path.join(source, 'backup.sql'), 'utf8');
  const blocks = [...dump.matchAll(/^COPY public\.([^\r\n]+?) \(([^\r\n]+)\) FROM stdin;\r?\n([\s\S]*?)^\\\.\r?$/gm)];
  if (blocks.length !== Object.keys(manifest).length) throw new Error('Incomplete COPY block inventory.');
  const expected = new Map();
  const sql = ['BEGIN;\nSET LOCAL session_replication_role = replica;\n'];
  for (const [block, rawTable, rawColumns, data] of blocks) {
    if (!identifier.test(rawTable)) throw new Error('Invalid table identifier.');
    const table = unquote(rawTable);
    if (table === '_prisma_migrations') continue;
    if (expected.has(table) || !tables.has(table)) throw new Error(`Unexpected table: ${table}`);
    for (const column of rawColumns.split(', ')) {
      if (!identifier.test(column) || !tables.get(table).has(unquote(column))) throw new Error(`Column mismatch in ${table}`);
    }
    const [{ count }] = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS count FROM public."${table}"`);
    if (count !== 0) throw new Error(`Restore target is not empty: ${table}`);
    expected.set(table, data ? data.split('\n').length - 1 : 0);
    sql.push(block + '\n');
  }
  sql.push('COMMIT;\n');
  const copyFile = path.join(source, 'validated-copy-only.sql');
  fs.writeFileSync(copyFile, sql.join(''), { mode: 0o600 });
  const result = spawnSync(path.join(root, 'runtime', 'pgsql', 'bin', 'psql.exe'),
    ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-h', '127.0.0.1', '-p', '55439', '-U', 'ci', '-d', 'mbf_restore_20260930', '-f', copyFile],
    { env: { ...process.env, PGPASSWORD: 'ci' }, encoding: 'utf8', windowsHide: true });
  // Error context may contain private rows. Keep it in the ignored local directory.
  fs.writeFileSync(path.join(source, 'restore-private.log'), (result.stderr || '') + (result.stdout || ''));
  if (result.status !== 0) throw new Error('Local restore failed; private diagnostic log retained (not printed).');
  const differences = [];
  let totalRows = 0;
  for (const [table, dumpCount] of expected) {
    const [{ count }] = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS count FROM public."${table}"`);
    totalRows += count;
    if (count !== dumpCount || count !== manifest[table]) differences.push({ table, restored: count, dump: dumpCount, manifest: manifest[table] });
  }
  const report = { backup: 'backup-20260929-163325', restoredTables: expected.size, totalRows, excluded: ['_prisma_migrations'], differences,
    scope: 'PostgreSQL data only; no MongoDB, files, live database or provider calls. Foreign-key triggers disabled only during this isolated COPY transaction; application/constraint acceptance is separate.' };
  fs.writeFileSync(path.join(source, 'restore-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (differences.length) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
