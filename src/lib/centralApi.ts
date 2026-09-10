import { env } from "@/lib/env";
import type { PartnerRecord } from "@/lib/partnerData";

/**
 * GST rate applied to subscription revenue reported to AN-Accounting.
 * 18% is the standard rate for SaaS/software services in India — but this
 * is a guess, not a verified fact about your actual GST registration or
 * how Plan.price is set (inclusive vs. exclusive of tax). Confirm the
 * correct treatment (possibly with a CA) and adjust this before relying on
 * the resulting GSTR-1/3B prep sheets in AN-Accounting.
 */
const SUBSCRIPTION_GST_RATE_PERCENT = 18;

/** Retry policy for transient failures talking to AN-Accounting. */
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [1000, 3000, 9000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** AN-Accounting's GSTIN validation — a malformed value rejects the ENTIRE push, not just that field. */
const GSTIN_FORMAT = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$/;

/**
 * Normalizes a (possibly free-text/untrimmed/lowercase) GSTIN and returns it
 * only if it matches AN-Accounting's required format; otherwise returns null
 * so the field is omitted instead of dragging the whole invoice/payment sync
 * down with it. Logs a warning when a non-empty value is dropped so bad
 * source data stays visible instead of silently disappearing.
 */
function sanitizeGstin(raw: string | null | undefined, ctx: string): string | null {
  const value = (raw ?? "").trim().toUpperCase();
  if (!value) return null;
  if (GSTIN_FORMAT.test(value)) return value;
  console.warn(`[centralApi] ${ctx}: GSTIN "${value}" doesn't match the expected format — omitting it from the push instead of failing the whole sync.`);
  return null;
}

/** 401/403 mean the API key is wrong/revoked — retrying won't help, a human must fix it. */
function isAuthError(status: number): boolean {
  return status === 401 || status === 403;
}

/** 5xx, 429, and other non-2xx (excluding auth errors) are treated as transient/worth retrying. */
function isRetryableStatus(status: number): boolean {
  return !isAuthError(status);
}

type PushContext = {
  /** What kind of push this is, for log messages ("sale" | "billing invoice"). */
  kind: string;
  /** Order/invoice id that identifies the record for a manual re-push. */
  externalOrderId: string;
};

/**
 * POSTs `body` to AN-Accounting with retry + exponential backoff for
 * transient failures (network errors, 5xx, 429). Does not retry 401/403 —
 * those mean the API key needs fixing, not another attempt. Never throws;
 * returns whether the push ultimately succeeded so callers that want to
 * aggregate/report failures (e.g. the recurring-invoice cron) can do so,
 * while callers that don't check the return value keep their existing
 * fire-and-forget behavior.
 */
async function postWithRetry(url: string, key: string, body: unknown, ctx: PushContext): Promise<boolean> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        return true;
      }

      const responseBody = await response.text().catch(() => "");

      if (isAuthError(response.status)) {
        console.error(
          `[centralApi] AN-Accounting ${ctx.kind} push rejected — auth error, not retrying. ` +
            `externalOrderId=${ctx.externalOrderId} status=${response.status} timestamp=${new Date().toISOString()} ` +
            `body=${responseBody.slice(0, 300)}`,
        );
        return false;
      }

      lastError = new Error(`HTTP ${response.status}: ${responseBody.slice(0, 300)}`);
      if (!isRetryableStatus(response.status)) {
        break;
      }
    } catch (error) {
      lastError = error;
    }

    if (attempt < MAX_ATTEMPTS) {
      await sleep(BACKOFF_MS[attempt - 1]);
    }
  }

  console.error(
    `[centralApi] AN-Accounting ${ctx.kind} push failed after ${MAX_ATTEMPTS} attempts — ` +
      `externalOrderId=${ctx.externalOrderId} timestamp=${new Date().toISOString()} error=${
        lastError instanceof Error ? lastError.message : String(lastError)
      }. Re-push manually once the issue is resolved.`,
  );
  return false;
}

/**
 * Pushes a captured partner subscription payment into AN-Accounting's sales
 * ingestion API (see that app's src/app/api/external/sales/route.ts) so it
 * shows up as a real invoice + ledger entry there, without manual re-entry.
 *
 * CENTRAL_API_URL should be the full endpoint, e.g.
 * https://your-an-accounting-app.vercel.app/api/external/sales
 * CENTRAL_API_KEY is that business's key from AN-Accounting's
 * Settings -> Sales API page.
 *
 * Deliberately never throws — a failure here must never break subscription
 * activation, which already happened by the time this is called. Retries
 * transient failures with backoff and logs clearly (with the payment id) on
 * final failure so it can be manually re-pushed; returns whether it
 * ultimately succeeded, which callers may ignore.
 */
export async function notifyCentralApiSale(
  partner: PartnerRecord,
  planName: string,
  payment: { razorpayPaymentId: string; amount: number; capturedAt: Date },
): Promise<boolean> {
  let url: string;
  let key: string;
  try {
    url = env.centralApiUrl();
    key = env.centralApiKey();
  } catch {
    // Not configured yet — expected until the user sets these env vars.
    return false;
  }

  return postWithRetry(
    url,
    key,
    {
      externalOrderId: payment.razorpayPaymentId,
      externalSource: "my-biz-flow",
      customer: {
        name: partner.businessName,
        email: partner.businessEmail,
        phone: partner.businessContact,
        gstin: sanitizeGstin(partner.gstin, `sale externalOrderId=${payment.razorpayPaymentId}`),
        state: partner.state,
      },
      lines: [
        {
          // AN-Accounting computes taxable-value * (1 + rate%) = line
          // total, so `rate` here must be the pre-tax amount — back it
          // out from the gross amount actually collected, so the
          // invoice's grand total matches the real payment.
          description: `Subscription — ${planName} (${partner.billingCycle})`,
          quantity: 1,
          rate: Number((payment.amount / (1 + SUBSCRIPTION_GST_RATE_PERCENT / 100)).toFixed(2)),
          gstRatePercent: SUBSCRIPTION_GST_RATE_PERCENT,
        },
      ],
      payment: {
        amount: payment.amount,
        method: "OTHER",
        reference: payment.razorpayPaymentId,
        date: payment.capturedAt.toISOString(),
      },
    },
    { kind: "sale", externalOrderId: payment.razorpayPaymentId },
  );
}

/**
 * Pushes a partner's own Billing invoice (a BusinessRecord in the "billing"
 * module — see src/components/BillingInvoiceForm.tsx) into AN-Accounting,
 * same endpoint/contract as notifyCentralApiSale above. Called right after
 * a billing record is created (src/lib/businessRecordActions.ts) and from
 * the recurring-invoice cron (src/app/api/cron/billing-recurring-invoices).
 *
 * The Billing form only captures a free-text customer name + GSTIN, not a
 * state — AN-Accounting's GST split needs one, so this falls back to the
 * partner's own state. That's a real limitation (not necessarily the
 * customer's actual state): fix by adding a state field to Billing
 * Contacts/the invoice form if intra- vs inter-state accuracy here matters.
 *
 * Deliberately never throws. Retries transient failures with backoff and
 * logs clearly (with the invoice id) on final failure so it can be
 * manually re-pushed; returns whether it ultimately succeeded, which
 * callers may ignore (existing call sites do) or aggregate (the cron does).
 */
export async function notifyCentralApiBillingInvoice(
  partner: PartnerRecord,
  invoice: {
    externalOrderId: string;
    customer: string;
    customerGstin?: string;
    items: { description: string; quantity: number; unitPrice: number; taxRate: number }[];
    totalAmount: number;
    issueDate?: string;
  },
): Promise<boolean> {
  let url: string;
  let key: string;
  try {
    url = env.centralApiUrl();
    key = env.centralApiKey();
  } catch {
    return false;
  }

  const lines = invoice.items
    .filter((it) => it.description)
    .map((it) => ({
      description: it.description,
      quantity: it.quantity,
      rate: it.unitPrice,
      gstRatePercent: it.taxRate,
    }));

  if (lines.length === 0) {
    console.warn(
      `[centralApi] billing invoice externalOrderId=${invoice.externalOrderId}: no line items with a description — ` +
        `skipping the AN-Accounting push (an empty lines array would be rejected anyway).`,
    );
    return false;
  }

  const customerName = invoice.customer.trim() || "Customer";

  return postWithRetry(
    url,
    key,
    {
      externalOrderId: invoice.externalOrderId,
      externalSource: "my-biz-flow",
      customer: {
        name: customerName,
        gstin: sanitizeGstin(invoice.customerGstin, `billing invoice externalOrderId=${invoice.externalOrderId}`),
        state: partner.state,
      },
      lines,
    },
    { kind: "billing invoice", externalOrderId: invoice.externalOrderId },
  );
}
