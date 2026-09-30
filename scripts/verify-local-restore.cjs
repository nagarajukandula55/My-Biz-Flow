const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const url = 'postgresql://ci:ci@127.0.0.1:55439/mbf_restore_20260930';
if (process.env.MBF_ISOLATED_TEST !== '1' || process.env.DATABASE_URL !== url) throw new Error('Disposable local restore database required.');
const prisma = new PrismaClient({ datasources: { db: { url } } });
const quote = name => '"' + name.replaceAll('"', '""') + '"';
async function main() {
  const report = await prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const keys = await tx.$queryRawUnsafe(`SELECT c.conname AS name, t.relname AS source, r.relname AS target,
      array_agg(a.attname ORDER BY k.ord) AS columns, array_agg(b.attname ORDER BY k.ord) AS referenced
      FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_class r ON r.oid=c.confrelid
      JOIN pg_namespace n ON n.oid=t.relnamespace
      CROSS JOIN LATERAL unnest(c.conkey,c.confkey) WITH ORDINALITY k(src,dst,ord)
      JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.src
      JOIN pg_attribute b ON b.attrelid=r.oid AND b.attnum=k.dst
      WHERE c.contype='f' AND n.nspname='public' GROUP BY c.conname,t.relname,r.relname`);
    const failures = [];
    for (const key of keys) {
      const nonnull = key.columns.map(column => `s.${quote(column)} IS NOT NULL`).join(' AND ');
      const equal = key.columns.map((column, i) => `s.${quote(column)}=r.${quote(key.referenced[i])}`).join(' AND ');
      const [{ count }] = await tx.$queryRawUnsafe(`SELECT count(*)::int AS count FROM public.${quote(key.source)} s WHERE ${nonnull} AND NOT EXISTS (SELECT 1 FROM public.${quote(key.target)} r WHERE ${equal})`);
      if (count) failures.push({ constraint: key.name, count });
    }
    return { checkedForeignKeys: keys.length, failures };
  }, { timeout: 30000 });
  fs.writeFileSync(path.join(__dirname, '..', '.local-test-db', 'restore-source', 'relationships-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.failures.length) process.exitCode = 1;
}
main().catch(() => { console.error('Local relationship verification failed.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
