// Catalog only; enforced read-only transaction. Never selects customer data.
const fs = require('node:fs');
require('@next/env').loadEnvConfig(process.cwd());
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: [] });
async function main() {
  const catalog = await prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const types = await tx.partnerType.findMany({ select: { id:true, status:true, idPrefix:true, defaultModules:true, planIds:true, planTierByPage:true }, orderBy:{id:'asc'} });
    const plans = await tx.plan.findMany({ select: { id:true, name:true, price:true, launchPrice:true, billingCycle:true, includedModuleSlugs:true, maxUsers:true, maxLocations:true, isPublic:true }, orderBy:{id:'asc'} });
    return { types, plans };
  }, { timeout:20000 });
  fs.writeFileSync('docs/pricing-catalog-audit-2026-10-07.json', JSON.stringify({checkedAt:new Date().toISOString(),scope:'Read-only catalog; no customer data',catalog},null,2)+'\n');
  console.log(`Saved ${catalog.types.length} types and ${catalog.plans.length} plans. No database changes.`);
}
main().catch(e=>{console.error('Pricing audit failed:',e.code||e.name);process.exitCode=1;}).finally(()=>prisma.$disconnect());
