const assert = require('node:assert/strict');
const test = require('node:test');
const load = require('./loadModule.cjs');

test('analytics summary never queries disabled modules', async () => {
 const queries=[];
 const analytics=load('src/lib/analyticsData.ts', {
  '@/lib/prisma': { prisma: {} }, '@/lib/moduleData': { MODULE_DATA: {} }, '@/lib/designer/moduleRegistry': {},
  '@/lib/sample-data/service-centre': { WORKORDER_STAGES: [] }, '@/lib/inventoryStock': {}, '@/lib/format': {},
  '@/lib/businessRecords': { listBusinessRecords: async (partner, module) => { assert.equal(partner,'p1'); queries.push(module); return []; } },
 });
 await analytics.getAnalyticsSummary('p1', []); assert.deepEqual(queries,[]);
 await analytics.getAnalyticsSummary('p1', ['billing']); assert.deepEqual(queries,['billing']);
 queries.length=0; await analytics.getAnalyticsSummary('p1', ['service-centre']); assert.deepEqual(queries,['service-centre']);
});

test('analytics page denies staff and performs no disabled module report queries', async () => {
 let kind='staff', calls=0;
 const empty=async () => { calls++; return []; };
 const page=load('src/app/partner/[partnerId]/analytics/page.tsx', {
  'react/jsx-runtime': { jsx:()=>null, jsxs:()=>null }, 'next/navigation': { redirect:()=>{throw new Error('redirect');} },
  '@/components/AppShell': {}, '@/components/DashboardWidget': {}, '@/components/charts': {}, '@/components/charts/ComboTrendCard': {},
  '@/lib/designer/registry': { registerPage(){} }, '@/lib/designer/entitlements': { getVisibleModuleSlugs: async()=>[] },
  '@/lib/format': {}, '@/lib/sample-data/service-centre': {}, '@/lib/requirePartnerSession': { requirePartnerSessionForPage: async()=>({kind}) },
  '@/lib/analyticsData': { getRevenueTrend:empty,getWorkorderStatusBreakdown:empty,getPeriodComparison:empty,getRevenueBySource:empty,
    getInvoiceStatusBreakdown:empty,getSixMonthTrend:empty,getTopBrandsByWorkorderCount:empty,getAverageTat:empty,
    getAnalyticsSummary:async(partner, modules)=>{assert.equal(partner,'p1');assert.equal(modules.length,0); return {}; } },
 });
 await assert.rejects(page.default({params:{partnerId:'p1'}}),/redirect/); assert.equal(calls,0);
 kind='owner'; await page.default({params:{partnerId:'p1'}}); assert.equal(calls,0);
});
