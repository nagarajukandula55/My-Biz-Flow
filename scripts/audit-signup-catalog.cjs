// Read-only catalog audit. Never reads customer records or changes the database.
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/designer/modules.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsObject });
require('@next/env').loadEnvConfig(process.cwd());
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: [] });
async function main() {
  const catalog = await prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const types = await tx.partnerType.findMany({ select: { id: true, status: true, defaultModules: true, planIds: true, requiresApproval: true }, orderBy: { id: 'asc' } });
    const plans = await tx.plan.findMany({ select: { id: true, isPublic: true, includedModuleSlugs: true }, orderBy: { id: 'asc' } });
    return { types, plans };
  }, { timeout: 20000 });
  const known = new Set(exportsObject.MODULES.map(m => m.slug));
  const active = catalog.types.filter(t => t.status === 'Active');
  const rows = exportsObject.MODULES.map(m => ({ module: m.slug, signupTypes: active.filter(t => Array.isArray(t.defaultModules) && t.defaultModules.includes(m.slug)).map(t => t.id) }));
  const issues = [];
  for (const type of active) {
    if (!Array.isArray(type.defaultModules) || !type.defaultModules.length) issues.push(`${type.id}: no module bundle`);
    for (const slug of type.defaultModules || []) if (!known.has(slug)) issues.push(`${type.id}: unknown module ${slug}`);
    if (!Array.isArray(type.planIds) || !type.planIds.length) issues.push(`${type.id}: no linked plans`);
    for (const id of type.planIds || []) {
      const plan = catalog.plans.find(p => p.id === id);
      if (!plan) issues.push(`${type.id}: missing plan ${id}`);
      else {
        if (!plan.isPublic) issues.push(`${type.id}: linked plan ${id} is not public`);
        for (const slug of plan.includedModuleSlugs || []) if (!(type.defaultModules || []).includes(slug)) issues.push(`${type.id}: plan ${id} includes ${slug} outside defaultModules; verify entitlement provisioning`);
      }
    }
    if (type.requiresApproval) issues.push(`${type.id}: approval flag is enabled but public signup currently bypasses it`);
  }
  const report = { checkedAt: new Date().toISOString(), scope: 'Read-only configured database catalog; availability is not end-to-end acceptance.', activeTypes: active.length, modules: rows, missingModules: rows.filter(r => !r.signupTypes.length).map(r => r.module), issues, catalog };
  fs.writeFileSync('docs/signup-catalog-audit-2026-10-06.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ activeTypes: report.activeTypes, modules: rows, missingModules: report.missingModules, issues }, null, 2));
}
main().catch(error => { console.error('Catalog audit failed:', error.code || error.name); process.exitCode = 1; }).finally(() => prisma.$disconnect());
