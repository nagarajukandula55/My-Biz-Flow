const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = require('./loadModule.cjs');
const documentPath = 'src/app/partner/[partnerId]/service-centre/[recordId]/service-record/ServiceCentreServiceRecordDocument.tsx';
const renderer = load(documentPath, {
  'react/jsx-runtime': require('react/jsx-runtime'),
  '@/components/PrintButton': { PrintButton: () => null },
  '@/components/PrintFrame': { PrintFrame: ({ sizes, children }) => React.createElement('div', { 'data-sizes': sizes.join(',') }, children) },
});
const input = {
  docNumber: 'WO-TEST', date: '05 Nov 2026', companyName: 'Test Repair Shop', customerName: 'Test Customer',
  lines: [{ description: 'Software service', hsn: '9987', quantity: 1, rate: 250, gstRate: 18 }],
};

test('estimate shares Service Record table and print layout but uses approval and estimated-total wording', async () => {
  const service = renderToStaticMarkup(await renderer.ServiceCentreServiceRecordDocument(input));
  const estimate = renderToStaticMarkup(await renderer.ServiceCentreServiceRecordDocument({
    ...input, documentKind: 'estimate', termsText: 'Estimate terms', footerNote: 'This is an estimate, not a tax invoice.',
  }));
  assert.match(service, /SERVICE RECORD/);
  assert.match(service, /Paid Amount/);
  assert.match(service, /This is a service record, not a tax invoice/);
  assert.match(estimate, /REPAIR ESTIMATE/);
  assert.match(estimate, /Estimated Total/);
  assert.match(estimate, /approval to proceed/);
  assert.match(estimate, /Estimate terms/);
  assert.doesNotMatch(estimate, /Paid Amount|This is a service record/);
  assert.equal(estimate.match(/<table[\s\S]*?<\/table>/)[0], service.match(/<table[\s\S]*?<\/table>/)[0]);
  assert.match(estimate, /₹295\.00/);
  assert.match(estimate, /data-sizes="a4,a5"/);
});

test('estimate uses estimate terms, the actual workorder reference and shared priced lines', async () => {
  const lines = input.lines;
  const record = { customer: 'Test Customer', receivedDate: '2026-11-05', issueDescription: 'Legacy fault', warrantyStatus: 'OOW' };
  const logged = [];
  const page = load('src/app/partner/[partnerId]/service-centre/[recordId]/estimate/page.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'),
    '../service-record/ServiceCentreServiceRecordDocument': renderer,
    '@/lib/sample-data/service-centre': { isUnderWarranty: () => false },
    '@/lib/serviceCentreLines': { buildServiceCentreLines: async () => lines },
    '@/lib/designer/registry': { registerPage: () => {} },
    'next/navigation': { notFound: () => { throw Error('not found'); } },
    '@/lib/partnerData': { getPartner: async () => ({ businessName: 'Test Shop', showLogoOnDocuments: false, logoDataUrl: 'hidden-logo' }), resolveDocumentTerms: (_partner, kind) => kind + ' terms' },
    '@/lib/businessRecords': { getBusinessRecord: async () => record },
    '@/lib/documentPrintLog': { appendDocumentPrintedLogEntry: async (...args) => logged.push(args) },
  });
  const result = await page.default({ params: { partnerId: 'p1', recordId: 'WO-TEST' } });
  assert.equal(result.type, renderer.ServiceCentreServiceRecordDocument);
  assert.equal(result.props.documentKind, 'estimate');
  assert.equal(result.props.docNumber, 'WO-TEST');
  assert.equal(result.props.termsText, 'estimate terms');
  assert.equal(result.props.logoUrl, null);
  assert.equal(result.props.lines, lines);
  assert.equal(result.props.issueTitle, 'Legacy fault');
  assert.match(result.props.footerNote, /quoted again before/);
  assert.equal(logged[0][2], 'Estimate');
});
