import QRCode from "qrcode";
import { SITE_URL } from "@/lib/seo";

/**
 * Public workorder-tracking QR for printed Service Centre documents — same
 * technique as src/lib/upiQr.ts (the `qrcode` package, rendered to a PNG
 * data URL) but encoding a plain URL instead of a UPI deep link, so any
 * phone camera (not just a UPI app) can scan it.
 *
 * Workorder numbers are only unique within a single partner's own records
 * (see service-centre-track's own docs), so the link must always carry the
 * partnerId alongside the code — a bare code isn't enough to find the job.
 */

/** The full public tracking URL a customer's scan (or a manual visit) should land on. */
export function buildTrackingUrl(partnerId: string, code: string): string {
  return `${SITE_URL}/service-centre-track/${encodeURIComponent(partnerId)}/${encodeURIComponent(code)}`;
}

/**
 * Returns a PNG data URL for the tracking QR, or null when there's nothing
 * legitimate to encode (missing partnerId/code) — callers render the QR
 * block only when this is non-null, same guarded pattern as
 * generateUpiQrDataUrl.
 */
export async function generateTrackingQrDataUrl(partnerId: string, code: string): Promise<string | null> {
  if (!partnerId?.trim() || !code?.trim()) return null;
  try {
    return await QRCode.toDataURL(buildTrackingUrl(partnerId, code), { margin: 1, width: 200 });
  } catch {
    // A QR that fails to generate must not take the whole document down.
    return null;
  }
}
