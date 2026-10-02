import { env } from "@/lib/env";
import { postWithRetry } from "@/lib/centralApi";

const COMMISSION_PERCENT = 10;

export type WalletOwnerType = "PARTNER" | "TELECALLING_AGENT";

export type WalletBalance = { available: string; pending: string; held: string; total: string };
export type WalletTransaction = {
  id: string;
  type: string;
  direction: "CREDIT" | "DEBIT";
  amount: string;
  status: "PENDING" | "AVAILABLE" | "REVERSED";
  availableAt: string;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
};
export type WalletStatement = {
  wallet: { id: string; status: "ACTIVE" | "FROZEN" | "CLOSED"; withdrawable: boolean; frozenReason: string | null } | null;
  balance: WalletBalance;
  transactions: WalletTransaction[];
};

const EMPTY_STATEMENT: WalletStatement = {
  wallet: null,
  balance: { available: "0.00", pending: "0.00", held: "0.00", total: "0.00" },
  transactions: [],
};

/** Reads an owner's wallet balance + statement. Never throws — returns an empty/zero wallet if unconfigured or on error. */
export async function getWalletStatement(ownerType: WalletOwnerType, ownerId: string): Promise<WalletStatement> {
  let url: string | undefined;
  let key: string;
  try {
    url = env.centralApiWalletStatementUrl();
    key = env.centralApiKey();
  } catch {
    return EMPTY_STATEMENT;
  }
  if (!url) return EMPTY_STATEMENT;

  try {
    const params = new URLSearchParams({ ownerType, ownerId });
    const res = await fetch(`${url}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return EMPTY_STATEMENT;
    const data = await res.json();
    return { wallet: data.wallet ?? null, balance: data.balance ?? EMPTY_STATEMENT.balance, transactions: data.transactions ?? [] };
  } catch {
    return EMPTY_STATEMENT;
  }
}

/** Requests a withdrawal for an owner's own wallet. */
export async function requestWalletWithdrawal(
  ownerType: WalletOwnerType,
  ownerId: string,
  amount: number,
): Promise<{ ok: boolean; withdrawalId?: string; error?: string }> {
  let url: string | undefined;
  let key: string;
  try {
    url = env.centralApiWalletWithdrawalUrl();
    key = env.centralApiKey();
  } catch {
    return { ok: false, error: "Wallet withdrawals are not configured yet." };
  }
  if (!url) return { ok: false, error: "Wallet withdrawals are not configured yet." };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ ownerType, ownerId, amount }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error || `Withdrawal request failed (${res.status}).` };
    return { ok: true, withdrawalId: data?.withdrawalId };
  } catch {
    return { ok: false, error: "Couldn't reach the wallet service. Try again shortly." };
  }
}

/**
 * Credits a 10% referral commission into the referrer's ANy Pay wallet
 * (held in the accounting app) when a referred partner makes their
 * first-ever captured subscription payment. Called from
 * src/lib/subscriptionPaymentReceipt.ts via the durable payment-delivery
 * queue (src/lib/paymentDeliveryQueue.ts), so a transient failure here
 * lands the job in "Review" for manual re-send rather than silently
 * losing the commission.
 *
 * Idempotent on `razorpayPaymentId` (passed as the credit's
 * idempotencyKey) — a retried delivery job can never double-credit.
 */
export async function creditReferralCommission(params: {
  referrer: { type: "PARTNER" | "STAFF"; id: string };
  referredPartnerId: string;
  razorpayPaymentId: string;
  amount: number;
  planName: string;
}): Promise<boolean> {
  let url: string | undefined;
  let key: string;
  try {
    url = env.centralApiWalletCreditUrl();
    key = env.centralApiKey();
  } catch {
    return false; // CENTRAL_API_KEY not set yet — expected pre-launch.
  }
  if (!url) return false; // Wallet credit URL not configured yet — expected pre-launch.

  const commission = Number(((params.amount * COMMISSION_PERCENT) / 100).toFixed(2));

  return postWithRetry(
    url,
    key,
    {
      ownerType: params.referrer.type === "PARTNER" ? "PARTNER" : "TELECALLING_AGENT",
      ownerId: params.referrer.id,
      type: "REFERRAL_COMMISSION",
      amount: commission,
      idempotencyKey: `my-biz-flow:referral-commission:${params.razorpayPaymentId}`,
      reason: `${COMMISSION_PERCENT}% referral commission — ${params.referredPartnerId}'s first payment (${params.planName})`,
      referenceType: "subscription_payment",
      referenceId: params.razorpayPaymentId,
      memo: `Referral commission: ${params.referredPartnerId} first payment via ${params.referrer.type === "PARTNER" ? "partner" : "telecalling agent"} referral`,
    },
    { kind: "wallet referral commission", externalOrderId: params.razorpayPaymentId },
  );
}
