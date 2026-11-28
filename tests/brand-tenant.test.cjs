const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');

test('Brand location reads and writes require an owned existing brand', async () => {
  let brand = null;
  let locationQueries = 0;
  let writes = 0;
  const data = load('src/lib/brandData.ts', {
    '@/lib/prisma': { prisma: {
      brand: { findUnique: async () => brand },
      location: {
        findMany: async () => { locationQueries++; return []; },
        findUnique: async () => { locationQueries++; return null; },
        create: async () => { writes++; },
      },
    } },
    '@/lib/tenant': {
      assertPartnerScope: (requested, actual) => { if (requested !== actual) throw new Error('wrong tenant'); },
      assertPartnerCanWrite: async () => {},
    },
    '@/lib/recordEntitlement': { assertRecordModuleAccess: async () => {} },
  });
  const input = { locationName: 'Branch', city: 'Vizianagaram', monthlyRevenue: 0, status: 'Active' };
  await assert.rejects(data.listLocationsForBrand('p1', 'missing'), /not found/);
  await assert.rejects(data.getLocation('p1', 'missing', 'l1'), /not found/);
  await assert.rejects(data.createLocation('p1', 'missing', input), /not found/);
  brand = { id: 'b2', partnerId: 'p2' };
  await assert.rejects(data.createLocation('p1', 'b2', input), /wrong tenant/);
  assert.equal(locationQueries, 0);
  assert.equal(writes, 0);
  brand = { id: 'b1', partnerId: 'p1' };
  await data.listLocationsForBrand('p1', 'b1');
  assert.equal(locationQueries, 1);
});
