const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const load = require('./loadModule.cjs');

test('provider webhook verification authenticates exact body and rejects replay or tampering', () => {
  const helper = load('src/lib/integration/webhookSecurity.ts', { 'node:crypto': crypto });
  const rawBody = JSON.stringify({ invoiceId: 'INV-1', status: 'paid' });
  const timestamp = 1700000000;
  const eventId = 'evt-1';
  const secret = 'test-secret';
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${eventId}.${rawBody}`).digest('hex');
  const input = { rawBody, signature, timestamp: String(timestamp), eventId, eventType: 'invoice.paid', secret, nowMs: timestamp * 1000 };
  const verified = helper.verifySignedWebhook(input);
  assert.equal(verified.payload.invoiceId, 'INV-1');
  assert.equal(verified.payload.status, 'paid');
  assert.throws(() => helper.verifySignedWebhook({ ...input, rawBody: rawBody.replace('paid', 'failed') }), /mismatch/);
  assert.throws(() => helper.verifySignedWebhook({ ...input, nowMs: (timestamp + 301) * 1000 }), /replay window/);
  assert.throws(() => helper.verifySignedWebhook({ ...input, signature: 'bad' }), /signature/);
});
