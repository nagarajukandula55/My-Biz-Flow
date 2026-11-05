const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');

function harness() {
  const result = load('src/lib/workorderActionResult.ts');
  class PartnerAuthorizationError extends Error {}
  const logs = [];
  const server = load('src/lib/workorderActionServer.ts', {
    'node:crypto': { randomUUID: () => 'incident-123' },
    '@/lib/errorLog': { logError: async entry => { logs.push(entry); throw new Error('logger unavailable'); } },
    '@/lib/requirePartnerSession': { PartnerAuthorizationError },
    '@/lib/workorderActionResult': result,
  }, { Error, console: { error: () => {} } });
  return { ...result, ...server, PartnerAuthorizationError, logs };
}

test('validation and session failures survive production serialization safely', async () => {
  const h = harness();
  const validation = await h.runWorkorderAction('save:p1', async () => { throw new h.WorkorderValidationError('Select a Solution.'); });
  assert.equal(JSON.parse(JSON.stringify(validation)).error, 'Select a Solution.');
  const auth = await h.runWorkorderAction('save:p1', async () => { throw new h.PartnerAuthorizationError('private tenant detail'); });
  assert.match(auth.error, /Sign in again/);
  assert.doesNotMatch(auth.error, /private tenant/);
  assert.equal(h.logs.length, 0);
});

test('unexpected failures retain diagnostic details on server even if logging fails', async () => {
  const h = harness();
  const response = await h.runWorkorderAction('save:p1', async () => { throw new Error('database secret details'); });
  assert.equal(response.reference, 'incident-123');
  assert.doesNotMatch(response.error, /secret/);
  assert.equal(h.logs[0].message, 'database secret details');
  assert.match(h.logs[0].source, /incident-123/);
});

test('client adapter stops a multi-step action after a failed result', async () => {
  const h = harness();
  let advanced = false;
  await assert.rejects(async () => {
    h.unwrapWorkorderResult({ ok: false, error: 'Save failed' });
    advanced = true;
  }, /Save failed/);
  assert.equal(advanced, false);
  const success = await h.runWorkorderAction('save:p1', async () => {});
  h.unwrapWorkorderResult(success);
});
