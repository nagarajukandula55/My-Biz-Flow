"use server";

import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { getNextNumber } from "@/lib/designer/numbering";
import { getPartner } from "@/lib/partnerData";
import { sendWorkorderTelegramAlert } from "@/lib/telegram";
import { newWorkorderCreatedMessage } from "@/lib/telegramTemplates";
import { SERVICE_CENTRE_REQUIRED_FIELDS } from "@/lib/serviceCentreRequiredFields";

/**
 * Service-Centre-specific create action: validates intake, assigns the Job
 * ID and the system-set fields, then delegates to the generic
 * createBusinessRecordAction.
 *
 * A wrapper rather than validation inside the generic action on purpose —
 * createBusinessRecordAction is shared by every module, and none of the
 * others should inherit Service Centre's required-field rules. The generic
 * action is untouched.
 *
 * The rules mirror the reference app's own server-side check
 * (api/crm/jobsheets POST): customer name, contact number, fault title and
 * the full address block are rejected when blank, and a GSTIN, when given,
 * must be a well-formed 15-character GSTIN. Client-side `required` is not
 * trusted — this runs on the server regardless of what the browser sent.
 */

/** Standard GSTIN: 2-digit state code, 10-char PAN, entity digit, 'Z', checksum. */
const GSTIN_RE = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Validation only — exported for the action below; pure, no I/O. */
export async function validateServiceCentreWorkorder(
  values: Record<string, unknown>
): Promise<string | null> {
  const text = (key: string) => String(values[key] ?? "").trim();

  const missing = SERVICE_CENTRE_REQUIRED_FIELDS.filter((f) => !text(f.key)).map((f) => f.label);
  if (missing.length > 0) {
    return `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required.`;
  }

  const phone = text("customerPhone").replace(/\D/g, "");
  if (phone.length < 10) return "Contact No must be a valid phone number (at least 10 digits).";

  const pincode = text("customerPincode").replace(/\D/g, "");
  if (pincode.length !== 6) return "Pincode must be 6 digits.";

  const gstin = text("customerGstin").toUpperCase();
  if (gstin && !GSTIN_RE.test(gstin)) {
    return "Customer GSTIN is not a valid 15-character GSTIN (e.g. 22AAAAA0000A1Z5).";
  }

  return null;
}

/** Bind with .bind(null, partnerId) before passing as a RecordForm `action` prop. */
export async function createServiceCentreWorkorderAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  const error = await validateServiceCentreWorkorder(values);
  if (error) return { error };

  // Job ID comes from this partner's own workorder numbering scheme — the
  // same NumberingMainScheme/NumberingPartnerScheme/NumberingCounter
  // mechanism invoice numbers use, configurable at
  // /partner/<id>/settings/numbering. The operator never types one.
  // Falls back to a WO+YYYYMMDD+seq default (matching AN-CRM's own
  // "WO202609150001" job-sheet-number format, e.g. WO202609150001) when
  // nothing is configured — a YY-YY financial-year-suffixed default used to
  // apply here instead, which is why workorders created before this fix
  // don't look like AN-CRM's.
  let jobId: string;
  try {
    jobId = await getNextNumber("service-centre.workorder", partnerId, {
      prefix: "WO",
      template: "{prefix}{yyyy}{mm}{dd}{seq}",
      sequenceDigits: 4,
    });
  } catch {
    // A numbering hiccup must never block a walk-in from being booked in.
    jobId = `WO-${Date.now().toString(36).toUpperCase()}`;
  }

  const now = new Date();

  // Fire the "new workorder" Telegram alert BEFORE createBusinessRecordAction,
  // since that call ends in redirect() (throws to abort the action) — nothing
  // after it would ever run. This is the one occasion made fully
  // workorder-aware end-to-end: sent via sendWorkorderTelegramAlert so the
  // Bot API's message_id gets tracked (TelegramLogEntry.messageId/workorderId),
  // letting a reply in Telegram get matched back to this exact workorder by
  // the webhook route. Every other alert type in TELEGRAM_ALERT_TYPES still
  // goes through the generic, non-threaded sendPartnerTelegramAlert.
  const partner = await getPartner(partnerId);
  if (partner) {
    await sendWorkorderTelegramAlert(
      partnerId,
      jobId,
      "newWorkorder",
      await newWorkorderCreatedMessage({
        partnerBusinessName: partner.businessName,
        workorderNumber: jobId,
        customerName: String(values["customer"] ?? ""),
        customerPhone: String(values["customerPhone"] ?? ""),
        deviceCategory: String(values["deviceCategory"] ?? ""),
        brandName: String(values["brandName"] ?? ""),
        modelName: String(values["modelName"] ?? ""),
        imeiOrSerialNumber: String(values["imeiOrSerialNumber"] ?? ""),
        faultDescription: String(values["faultDescription"] ?? ""),
        priority: String(values["priority"] ?? ""),
        loggedBy: String(values["loggedBy"] ?? ""),
        receivedDate: String(values["receivedDate"] ?? now.toISOString().slice(0, 10)),
        estimatedAmount: values["estimatedAmount"] ? `₹${Number(values["estimatedAmount"]).toLocaleString("en-IN")}` : "",
        warrantyStatus: String(values["warrantyStatus"] ?? ""),
      })
    );
  }

  await createBusinessRecordAction(partnerId, "service-centre", {
    ...values,
    id: jobId,
    // System-set at intake, which is why these three aren't on the form.
    status: values["status"] || "Created",
    stage: values["stage"] || "Created",
    receivedDate: values["receivedDate"] || now.toISOString().slice(0, 10),
    customerGstin: String(values["customerGstin"] ?? "").trim().toUpperCase(),
  });
}
