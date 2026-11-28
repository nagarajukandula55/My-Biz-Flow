"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBusinessRecord, updateBusinessRecord, getBusinessRecord } from "@/lib/businessRecords";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { validateServiceCentreWorkorder } from "@/lib/serviceCentreCreateAction";
import { SERVICE_CENTRE_REQUIRED_FIELDS } from "@/lib/serviceCentreRequiredFields";
import { getNextNumber } from "@/lib/designer/numbering";
import { getPartner } from "@/lib/partnerData";
import { prisma } from "@/lib/prisma";
import { sendWorkorderTelegramAlert } from "@/lib/telegram";
import { newWorkorderCreatedMessage } from "@/lib/telegramTemplates";
import { withRecordLock } from "@/lib/withRecordLock";
import { assertRecordModuleAccess } from "@/lib/recordEntitlement";
import { invoiceNumberingConfig, resolveInvoiceDocumentType } from "@/lib/invoiceNumbering";
import { effectiveInquiryStatus, INQUIRY_CLOSE_REASONS } from "@/lib/sample-data/service-centre-inquiry";
import { afterDatabaseCommit } from "@/lib/databaseTransaction";

/** Staff-side "log a call-in inquiry" — bound to InquiryNewButton's modal form. */
export async function createInquiryAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  await assertRecordModuleAccess(partnerId, "service-centre-inquiry");

  const customerName = String(values.customerName ?? "").trim();
  const customerPhone = String(values.customerPhone ?? "").trim();
  if (!customerName || !customerPhone) return { error: "Customer Name and Phone are required" };
  const customerEmail = String(values.customerEmail ?? "").trim();
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) return { error: "Enter a valid email address" };

  // Same pincode -> city/state lookup convertInquiryToWorkorderAction
  // already did at conversion time — doing it here too means the inquiry
  // itself shows where the customer is right away, and conversion has one
  // less thing it might need the customer to supply later.
  const pincode = String(values.pincode ?? "").trim();
  let city = "";
  let state = "";
  if (/^\d{6}$/.test(pincode)) {
    const match = await prisma.postalPincode.findFirst({ where: { pincode } });
    if (match) {
      city = match.district;
      state = match.state;
    }
  }

  const record = await createBusinessRecord(partnerId, "service-centre-inquiry", {
    ...values,
    city,
    state,
    status: "Open",
    source: "Staff",
    createdAt: new Date().toISOString(),
  });

  revalidatePath(`/partner/${partnerId}/service-centre/inquiries`);
  redirect(`/partner/${partnerId}/service-centre/inquiries/${record.id}?created=1`);
}

/** Edits customer-entered inquiry fields without replacing status or conversion history. */
export async function updateInquiryAction(
  partnerId: string,
  inquiryId: string,
  values: Record<string, unknown>
): Promise<void | { error: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  await assertRecordModuleAccess(partnerId, "service-centre-inquiry");
  const customerName = String(values.customerName ?? "").trim();
  const customerPhone = String(values.customerPhone ?? "").trim();
  const customerEmail = String(values.customerEmail ?? "").trim();
  if (!customerName || customerPhone.replace(/\D/g, "").length < 10) return { error: "Enter a customer name and a valid phone number." };
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) return { error: "Enter a valid email address." };
  const allowed = ["customerName", "customerPhone", "customerEmail", "serviceType", "complaint", "brand", "model", "addressLine", "pincode", "preferredDate"];
  const changes = Object.fromEntries(allowed.filter((key) => Object.hasOwn(values, key)).map((key) => [key, values[key]]));
  const result = await withRecordLock("service-centre-inquiry-convert", `${partnerId}:${inquiryId}`, async () => {
    const record = await getBusinessRecord(partnerId, "service-centre-inquiry", inquiryId);
    if (!record) return { error: "Inquiry not found" };
    if (effectiveInquiryStatus(record) !== "Open") return { error: "Only an Open inquiry can be edited" };
    if (Object.hasOwn(changes, "pincode") && changes.pincode !== record["pincode"]) {
      const pincode = String(changes.pincode ?? "").trim();
      if (pincode && !/^\d{6}$/.test(pincode)) return { error: "Enter a valid six-digit pincode." };
      const match = pincode ? await prisma.postalPincode.findFirst({ where: { pincode } }) : null;
      changes.city = match?.district ?? "";
      changes.state = match?.state ?? "";
    }
    await updateBusinessRecord(partnerId, "service-centre-inquiry", inquiryId, { ...record, ...changes, status: "Open" });
    return null;
  });
  if (result) return result;
  revalidatePath(`/partner/${partnerId}/service-centre/inquiries`);
  redirect(`/partner/${partnerId}/service-centre/inquiries/${inquiryId}?updated=1`);
}

/** Closes an inquiry with a standardised reason — never deletes it, so the dashboard can still summarize why. */
export async function closeInquiryAction(
  partnerId: string,
  inquiryId: string,
  formData: FormData
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  await assertRecordModuleAccess(partnerId, "service-centre-inquiry");
  const reason = String(formData.get("closeReason") ?? "").trim();
  if (!INQUIRY_CLOSE_REASONS.includes(reason as typeof INQUIRY_CLOSE_REASONS[number])) return { error: "Select a valid close reason" };

  const result = await withRecordLock("service-centre-inquiry-convert", `${partnerId}:${inquiryId}`, async () => {
    const record = await getBusinessRecord(partnerId, "service-centre-inquiry", inquiryId);
    if (!record) return { error: "Inquiry not found" };
    if (effectiveInquiryStatus(record) !== "Open") return { error: "Only an Open inquiry can be closed" };
    await updateBusinessRecord(partnerId, "service-centre-inquiry", inquiryId, {
      ...record, status: "Closed", closeReason: reason, closedAt: new Date().toISOString(),
    });
    return null;
  });
  if (result) return result;

  revalidatePath(`/partner/${partnerId}/service-centre/inquiries`);
  // ?updated=1 -> RecordDetail's own SuccessBanner (same convention every
  // other record edit in this app uses), so closing shows a real "updated"
  // confirmation instead of the panel just silently re-rendering.
  redirect(`/partner/${partnerId}/service-centre/inquiries/${inquiryId}?updated=1`);
}

/** Cancel an unconverted inquiry while retaining its history for reporting. */
export async function cancelInquiryAction(partnerId: string, inquiryId: string, reason: string): Promise<void | { error: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  await assertRecordModuleAccess(partnerId, "service-centre-inquiry");
  const why = reason.trim();
  if (!INQUIRY_CLOSE_REASONS.includes(why as typeof INQUIRY_CLOSE_REASONS[number])) return { error: "Select a valid cancellation reason" };
  const result = await withRecordLock("service-centre-inquiry-convert", `${partnerId}:${inquiryId}`, async () => {
    const record = await getBusinessRecord(partnerId, "service-centre-inquiry", inquiryId);
    if (!record) return { error: "Inquiry not found" };
    if (effectiveInquiryStatus(record) !== "Open") return { error: "Only an Open inquiry can be cancelled" };
    await updateBusinessRecord(partnerId, "service-centre-inquiry", inquiryId, {
      ...record, status: "Cancelled", cancelReason: why, cancelledAt: new Date().toISOString(),
    });
    return null;
  });
  if (result) return result;
  revalidatePath(`/partner/${partnerId}/service-centre/inquiries`);
  redirect(`/partner/${partnerId}/service-centre/inquiries/${inquiryId}?updated=1`);
}

/**
 * Moves an Open inquiry to a real workorder — the call the customer accepted
 * to proceed with. Not a thin wrapper around createServiceCentreWorkorderAction:
 * that action always ends in a redirect() (via createBusinessRecordAction),
 * which would throw before this could mark the inquiry Converted — so this
 * duplicates its minimal create logic instead, in the right order: mint the
 * id, CREATE the workorder, and only once that succeeds mark the inquiry
 * Converted. (Previously the inquiry was marked Converted first — if the
 * workorder create then failed for any reason, the inquiry was left
 * permanently Converted, pointing at a convertedToWorkorderId that was
 * never actually created, with no way to retry since only an Open inquiry
 * can be converted. Creating first means a failure here just leaves the
 * inquiry Open, safely retryable.)
 *
 * `overrides` fills in exactly the workorder-required fields the inquiry
 * itself couldn't already supply (e.g. no address on file, or a pincode
 * that isn't in PostalPincode so city/state couldn't be derived) — see
 * InquiryLifecycle.tsx's "Complete workorder details" modal, which only
 * asks for whatever `missing` names below. When the inquiry already has
 * everything a workorder needs, this is called with no overrides and the
 * workorder is created directly, no prompting.
 */
export async function convertInquiryToWorkorderAction(
  partnerId: string,
  inquiryId: string,
  overrides?: Record<string, string>
): Promise<void | { error?: string; missing?: { key: string; label: string }[] }> {
  partnerId = await requireSessionPartnerId(partnerId);
  await assertRecordModuleAccess(partnerId, "service-centre-inquiry");

  // Serializes concurrent convert attempts for the SAME inquiry (double-
  // click on "Convert to Workorder" before the button disables) — without
  // it, two overlapping calls could both pass the `status !== "Open"`
  // guard below and both mint a jobId / create a workorder.
  const jobId = await withRecordLock("service-centre-inquiry-convert", `${partnerId}:${inquiryId}`, () =>
    convertInquiryToWorkorderInner(partnerId, inquiryId, overrides)
  );
  if (typeof jobId !== "string") return jobId; // { error, missing? } — validation/not-found failure

  revalidatePath(`/partner/${partnerId}/service-centre/inquiries`);
  revalidatePath(`/partner/${partnerId}/service-centre`);
  redirect(`/partner/${partnerId}/service-centre/${jobId}?created=1`);
}

async function convertInquiryToWorkorderInner(
  partnerId: string,
  inquiryId: string,
  overrides?: Record<string, string>
): Promise<string | { error?: string; missing?: { key: string; label: string }[] }> {
  const inquiry = await getBusinessRecord(partnerId, "service-centre-inquiry", inquiryId);
  if (!inquiry) return { error: "Inquiry not found" };
  if (effectiveInquiryStatus(inquiry) !== "Open") return { error: "Only an Open inquiry can be converted" };

  const pincode = String(overrides?.customerPincode ?? inquiry["pincode"] ?? "").trim();
  // The inquiry already has city/state stored (createInquiryAction /
  // bookAppointmentAction derive them from the same pincode at intake) —
  // only re-derive here for an inquiry logged before that, or when the
  // pincode changed via an override.
  let city = overrides?.customerPincode ? "" : String(inquiry["city"] ?? "");
  let state = overrides?.customerPincode ? "" : String(inquiry["state"] ?? "");
  if (!city && !state && /^\d{6}$/.test(pincode)) {
    const match = await prisma.postalPincode.findFirst({ where: { pincode } });
    if (match) {
      city = match.district;
      state = match.state;
    }
  }

  const values: Record<string, unknown> = {
    customer: inquiry["customerName"],
    customerPhone: inquiry["customerPhone"],
    customerEmail: inquiry["customerEmail"] ?? "",
    faultDescription: inquiry["complaint"],
    customerAddress: inquiry["addressLine"] ?? "",
    customerCity: city,
    customerState: state,
    customerPincode: pincode,
    brandName: inquiry["brand"] ?? "",
    modelName: inquiry["model"] ?? "",
    // User-supplied overrides win over both the inquiry's own fields and
    // the pincode-derived city/state — someone filling the "missing
    // details" modal is correcting/completing the record, not guessing.
    ...overrides,
  };

  const error = await validateServiceCentreWorkorder(values);
  if (error) {
    // Whichever required fields are blank OR fail their own format check
    // (phone < 10 digits, pincode != 6 digits) — the modal needs both
    // cases, not just "blank", or a badly-formatted pincode would report
    // no missing fields at all despite validation failing.
    const text = (key: string) => String(values[key] ?? "").trim();
    const missing = SERVICE_CENTRE_REQUIRED_FIELDS.filter((f) => {
      const v = text(f.key);
      if (!v) return true;
      if (f.key === "customerPhone") return v.replace(/\D/g, "").length < 10;
      if (f.key === "customerPincode") return v.replace(/\D/g, "").length !== 6;
      return false;
    });
    return { error, missing };
  }

  let jobId: string;
  try {
    jobId = await getNextNumber("service-centre.workorder", partnerId, {
      prefix: "WO",
      template: "{prefix}{yyyy}{mm}{dd}{seq}",
      sequenceDigits: 4,
    });
  } catch {
    // Random suffix, not just millisecond time — see serviceCentreCreateAction.ts's identical fallback for why.
    jobId = `WO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }
  const now = new Date();

  // Create the workorder FIRST — only once this succeeds is the inquiry
  // marked Converted (below). If createBusinessRecord throws here, the
  // inquiry is simply left Open and can be converted again; nothing has
  // committed to a half-real state.
  await createBusinessRecord(partnerId, "service-centre", {
    ...values,
    id: jobId,
    status: "Created",
    stage: "Created",
    receivedDate: now.toISOString().slice(0, 10),
    customerGstin: "",
  });

  await updateBusinessRecord(partnerId, "service-centre-inquiry", inquiryId, {
    ...inquiry,
    status: "Converted",
    conversionType: "Workorder",
    convertedToWorkorderId: jobId,
    convertedAt: now.toISOString(),
  });

  // Best-effort, fired only after both writes above have actually landed —
  // previously this ran before the workorder record existed, so a
  // create failure right after could still have notified staff about a job
  // that was never actually booked.
  const partner = await getPartner(partnerId);
  if (partner) {
    await afterDatabaseCommit(async () => sendWorkorderTelegramAlert(
      partnerId,
      jobId,
      "newWorkorder",
      await newWorkorderCreatedMessage({
        partnerBusinessName: partner.businessName,
        workorderNumber: jobId,
        customerName: String(values["customer"] ?? ""),
        customerPhone: String(values["customerPhone"] ?? ""),
        deviceCategory: "",
        brandName: String(values["brandName"] ?? ""),
        modelName: String(values["modelName"] ?? ""),
        imeiOrSerialNumber: "",
        faultDescription: String(values["faultDescription"] ?? ""),
        priority: "",
        loggedBy: "",
        receivedDate: now.toISOString().slice(0, 10),
        estimatedAmount: "",
        warrantyStatus: "",
      })
    ));
  }

  return jobId;
}

export async function convertInquiryToSalesInvoiceAction(
  partnerId: string,
  inquiryId: string,
  input: { description: string; quantity?: number; amount: number; taxRate: number; hsnCode?: string; invoiceType: "GST" | "Non-GST" }
): Promise<void | { error: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  await assertRecordModuleAccess(partnerId, "service-centre-inquiry");
  await assertRecordModuleAccess(partnerId, "billing");
  const description = String(input.description ?? "").trim();
  const quantity = Number(input.quantity ?? 1);
  const hsnCode = String(input.hsnCode ?? "").trim();
  const amount = Number(input.amount);
  const taxRate = Number(input.taxRate);
  if (!description || !Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount * 100)) || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-8) return { error: "Enter an item description and a positive amount with at most two decimal places." };
  if (!Number.isSafeInteger(quantity) || quantity <= 0) return { error: "Enter a positive whole-number quantity." };
  if (![0, 0.25, 3, 5, 12, 18, 28].includes(taxRate)) return { error: "Select a valid tax rate." };
  if (!["GST", "Non-GST"].includes(input.invoiceType)) return { error: "Select a valid invoice type." };
  const partner = await getPartner(partnerId);
  if (input.invoiceType === "GST" && !partner?.gstin?.trim()) return { error: "A GST invoice requires this business's GSTIN." };
  if (input.invoiceType === "GST" && !hsnCode) return { error: "Enter the item's HSN/SAC code for the GST invoice." };
  if (input.invoiceType === "Non-GST" && taxRate !== 0) return { error: "A Non-GST invoice must use zero tax." };
  const result = await withRecordLock("service-centre-inquiry-convert", `${partnerId}:${inquiryId}`, async () => {
    const inquiry = await getBusinessRecord(partnerId, "service-centre-inquiry", inquiryId);
    if (!inquiry) return { error: "Inquiry not found" };
    if (effectiveInquiryStatus(inquiry) !== "Open") return { error: "Only an Open inquiry can be converted" };
    if (!String(inquiry["customerName"] ?? "").trim() || String(inquiry["customerPhone"] ?? "").replace(/\D/g, "").length < 10) return { error: "Complete the customer's name and phone before invoicing." };
    const invoiceType = resolveInvoiceDocumentType(input.invoiceType, Boolean(partner?.gstin?.trim()));
    const numbering = invoiceNumberingConfig(invoiceType);
    const invoiceNumber = await getNextNumber(numbering.documentType, partnerId, numbering.defaults);
    const subtotalPaise = Math.round(amount * 100) * quantity;
    if (!Number.isSafeInteger(subtotalPaise) || subtotalPaise <= 0) return { error: "The invoice amount is too large." };
    const subtotal = subtotalPaise / 100;
    const taxAmount = Math.round(subtotal * taxRate) / 100;
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
    const now = new Date();
    const invoice = await createBusinessRecord(partnerId, "billing", {
      invoiceNumber, invoiceType, invoiceSource: "Service Centre", sourceInquiryId: inquiryId,
      customer: String(inquiry["customerName"] ?? ""), customerPhone: String(inquiry["customerPhone"] ?? ""),
      customerEmail: String(inquiry["customerEmail"] ?? ""), customerAddress: String(inquiry["addressLine"] ?? ""),
      customerCity: String(inquiry["city"] ?? ""), customerState: String(inquiry["state"] ?? ""),
      customerPincode: String(inquiry["pincode"] ?? ""), customerGstin: "",
      issueDate: now.toISOString().slice(0, 10), paymentStatus: "Draft", amountPaid: 0, amountDue: totalAmount,
      items: [{ description, quantity, unit: "pcs", unitPrice: amount, taxRate, hsnCode }],
      lineItemsSummary: description, subtotal, taxAmount, totalAmount,
    });
    await updateBusinessRecord(partnerId, "service-centre-inquiry", inquiryId, {
      ...inquiry, status: "Converted", conversionType: "Sales Invoice",
      convertedToInvoiceId: String(invoice.id), convertedAt: now.toISOString(),
    });
    return String(invoice.id);
  });
  if (typeof result !== "string") return result;
  revalidatePath(`/partner/${partnerId}/service-centre/inquiries`);
  revalidatePath(`/partner/${partnerId}/billing`);
  redirect(`/partner/${partnerId}/billing/${result}?created=1`);
}
