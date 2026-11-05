const test = require('node:test');
const assert = require('node:assert/strict');
const loadModule = require('./loadModule.cjs');

test('referral wallet credit uses the central action and paise units', async () => {
  let request;
  const wallet = loadModule(require.resolve('../src/lib/walletClient.ts'), {
    '@/lib/env': {
      env: {
        centralApiWalletCreditUrl: () => 'https://admin.example/api/external/wallet',
        centralApiKey: () => 'secret',
      },
    },
    '@/lib/centralApi': {
      postWithRetry: async (_url, _key, body) => {
        request = body;
        return true;
      },
    },
  });

  const ok = await wallet.creditReferralCommission({
    referrer: { type: 'PARTNER', id: 'partner-1' },
    referredPartnerId: 'partner-2',
    razorpayPaymentId: 'pay_123',
    amount: 1200,
    planName: 'Pro',
  });

  assert.equal(ok, true);
  assert.equal(request.action, 'credit');
  assert.equal(request.ownerType, 'PARTNER');
  assert.equal(request.amount, 12000);
  assert.equal(request.idempotencyKey, 'my-biz-flow:referral-commission:pay_123');
});
