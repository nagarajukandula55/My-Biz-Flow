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
 * activation, which already happened by the time this is called. Logs and
 * returns instead.
 */
export async function notifyCentralApiSale(
  partner: PartnerRecord,
  planName: string,
  payment: { razorpayPaymentId: string; amount: number; capturedAt: Date },
): Promise<void> {
  let url: string;
  let key: string;
  try {
    url = env.centralApiUrl();
    key = env.centralApiKey();
  } catch {
    // Not configured yet — expected until the user sets these env vars.
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        externalOrderId: payment.razorpayPaymentId,
        externalSource: "my-biz-flow",
        customer: {
          name: partner.businessName,
          email: partner.businessEmail,
          phone: partner.businessContact,
          gstin: partner.gstin || null,
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
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[centralApi] AN-Accounting sales ingestion failed (${response.status}): ${body.slice(0, 300)}`);
    }
  } catch (error) {
    console.error("[centralApi] Could not reach AN-Accounting sales ingestion endpoint:", error);
  }
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
): Promise<void> {
  let url: string;
  let key: string;
  try {
    url = env.centralApiUrl();
    key = env.centralApiKey();
  } catch {
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        externalOrderId: invoice.externalOrderId,
        externalSource: "my-biz-flow",
        customer: {
          name: invoice.customer,
          gstin: invoice.customerGstin || null,
          state: partner.state,
        },
        lines: invoice.items
          .filter((it) => it.description)
          .map((it) => ({
            description: it.description,
            quantity: it.quantity,
            rate: it.unitPrice,
            gstRatePercent: it.taxRate,
          })),
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[centralApi] AN-Accounting billing push failed (${response.status}): ${body.slice(0, 300)}`);
    }
  } catch (error) {
    console.error("[centralApi] Could not reach AN-Accounting sales ingestion endpoint:", error);
  }
}
