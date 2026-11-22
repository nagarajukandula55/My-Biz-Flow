const assert = require('node:assert/strict');
const test = require('node:test');
const load = require('./loadModule.cjs');

test('invoice naming retains INV for GST and BILL for Non-GST with separate counters', () => {
  const { invoiceNumberingConfig } = load('src/lib/invoiceNumbering.ts');
  const gst = invoiceNumberingConfig('GST');
  const nonGst = invoiceNumberingConfig('Non-GST');
  assert.equal(gst.documentType, 'invoice.gst');
  assert.equal(gst.defaults.prefix, 'INV');
  assert.equal(nonGst.documentType, 'invoice.non-gst');
  assert.equal(nonGst.defaults.prefix, 'BILL');
});
