const assert = require('node:assert/strict');
const test = require('node:test');
const load = require('./loadModule.cjs');

function numberingHarness() {
  const counters = new Map([
    ['partner:p1:invoice.b2b', 47],
    ['partner:p1:invoice.b2c', 23],
  ]);
  const schemes = new Map([
    ['p1:invoice.b2b', { prefix: 'INV', separator: '-', financialYearFormat: 'none', sequenceDigits: 4, sequenceStart: 1, suffix: '' }],
    ['p1:invoice.b2c', { prefix: 'BILL', separator: '-', financialYearFormat: 'none', sequenceDigits: 4, sequenceStart: 1, suffix: '' }],
  ]);
  const prisma = {
    numberingPartnerScheme: {
      findUnique: async ({ where }) => {
        const key = `${where.partnerId_documentType.partnerId}:${where.partnerId_documentType.documentType}`;
        const scheme = schemes.get(key); return scheme ? { scheme } : null;
      },
    },
    numberingMainScheme: { findUnique: async () => null },
    numberingCounter: {
      findUnique: async ({ where }) => counters.has(where.scopeKey) ? { value: counters.get(where.scopeKey) } : null,
      upsert: async ({ where, create, update }) => {
        const key = where.scopeKey;
        if (!counters.has(key)) { counters.set(key, create.value); return { value: create.value }; }
        const value = counters.get(key) + (update.value?.increment ?? 0); counters.set(key, value); return { value };
      },
    },
  };
  const formatNumber = (scheme, value) => `${scheme.prefix}${scheme.separator}${String(value).padStart(scheme.sequenceDigits, '0')}`;
  return { counters, numbering: load('src/lib/designer/numbering.ts', {
    '@/lib/prisma': { prisma },
    './numberingFormat': { DEFAULT_SCHEME: { prefix: 'INV', separator: '-', financialYearFormat: 'YY-YY', sequenceDigits: 4, sequenceStart: 1, suffix: '' }, formatNumber },
  }) };
}

test('GST and Non-GST counters inherit established invoice streams instead of restarting', async () => {
  const { counters, numbering } = numberingHarness();
  assert.equal(await numbering.previewNextNumber('invoice.gst', 'p1'), 'INV-0048');
  assert.equal(await numbering.previewNextNumber('invoice.non-gst', 'p1'), 'BILL-0024');
  assert.equal(await numbering.getNextNumber('invoice.gst', 'p1'), 'INV-0048');
  assert.equal(await numbering.getNextNumber('invoice.non-gst', 'p1'), 'BILL-0024');
  assert.equal(counters.get('partner:p1:invoice.gst'), 48);
  assert.equal(counters.get('partner:p1:invoice.non-gst'), 24);
});
