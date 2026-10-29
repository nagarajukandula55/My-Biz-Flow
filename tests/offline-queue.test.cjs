const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./loadModule.cjs');

test('offline queue ignores malformed local drafts before replay', () => {
  let stored = JSON.stringify([{ id: 'good', kind: 'invoice', payload: { total: 10 }, createdAt: '2026-01-01T00:00:00.000Z' }, { id: '', kind: 'bad', payload: {}, createdAt: 'x' }, null, { id: 'bad-shape', kind: 'x', payload: [] }]);
  const localStorage = { getItem: () => stored, setItem: (_key, value) => { stored = value; } };
  const queue = load('src/lib/offlineQueue.ts', {}, { window: { dispatchEvent() {} }, localStorage });
  assert.equal(queue.readOfflineDrafts().map(draft => draft.id).join(','), 'good');
});
