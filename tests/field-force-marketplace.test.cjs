const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function findEligibleProviders(providers, job) {
  return providers.filter((p) => {
    if (p.status !== 'active' || p.isAvailable === false) return false;
    if (!job.requiredServiceIds.every((id) => p.services.some((s) => s.id === id))) return false;
    if (p.pincode === job.pincode) return true;
    return p.serviceAreas.some((a) => a.pincode === job.pincode || (!a.pincode && a.state === job.state));
  });
}

test('unavailable providers are excluded from matching', () => {
  const providers = [
    { id: 'available', status: 'active', isAvailable: true, pincode: '530001', services: [{ id: 'svc' }], serviceAreas: [] },
    { id: 'paused', status: 'active', isAvailable: false, pincode: '530001', services: [{ id: 'svc' }], serviceAreas: [] },
    { id: 'pending', status: 'pending', isAvailable: true, pincode: '530001', services: [{ id: 'svc' }], serviceAreas: [] },
  ];
  assert.deepEqual(findEligibleProviders(providers, { pincode: '530001', requiredServiceIds: ['svc'] }).map((p) => p.id), ['available']);
});

test('provider must offer every required service and cover the job area', () => {
  const providers = [
    { id: 'wrong-service', status: 'active', isAvailable: true, pincode: '530001', services: [{ id: 'other' }], serviceAreas: [] },
    { id: 'covered-area', status: 'active', isAvailable: true, pincode: '530002', services: [{ id: 'svc' }], serviceAreas: [{ state: 'Andhra Pradesh' }] },
  ];
  assert.deepEqual(findEligibleProviders(providers, { pincode: '530999', state: 'Andhra Pradesh', requiredServiceIds: ['svc'] }).map((p) => p.id), ['covered-area']);
});

test('allocation controls are bounded and keep safe defaults', () => {
  const source = fs.readFileSync('src/lib/fieldForce/allocationControls.ts', 'utf8');
  assert.match(source, /maxOffersPerBooking: 10/);
  assert.match(source, /offerExpiryMinutes: 15/);
  assert.match(source, /Math\.min\(50/);
  assert.match(source, /Math\.min\(120/);
});
