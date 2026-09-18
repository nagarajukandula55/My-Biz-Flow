"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBusinessRecord, updateBusinessRecord, getBusinessRecord } from "@/lib/businessRecords";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { validateServiceCentreWorkorder } from "@/lib/serviceCentreCreateAction";
import { getNextNumber } from "@/lib/designer/numbering";
import { getPartner } from "@/lib/partnerData";
import { prisma } from "@/lib/prisma";
import { sendWorkorderTelegramAlert } from "@/lib/telegram";
import { newWorkorderCreatedMessage } from "@/lib/telegramTemplates";

/** Staff-side "log a call-in inquiry" — bound to InquiryNewButton's modal form. */
export async function createInquiryAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const customerName = String(values.customerName ?? "").trim();
  const customerPhone = String(values.customerPhone ?? "").trim();
  if (!customerName || !customerPhone) return { error: "Customer Name and Phone are required" };

  const record = await createBusinessRecord(partnerId, "service-centre-inquiry", {
    ...values,
    status: "Open",
    source: "Staff",
    createdAt: new Date().toISOString(),
  });

  revalidatePath(`/partner/${partnerId}/service-centre/inquiries`);
  redirect(`/partner/${partnerId}/service-centre/inquiries/${record.id}?created=1`);
}

/** Closes an inquiry with a standardised reason — never deletes it, so the dashboard can still summarize why. */
export async function closeInquiryAction(
  partnerId: string,
  inquiryId: string,
  formData: FormData
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const reason = String(formData.get("closeReason") ?? "").trim();
  if (!reason) return { error: "Select a close reason" };

  const record = await getBusinessRecord(partnerId, "service-centre-inquiry", inquiryId);
  if (!record) return { error: "Inquiry not found" };
  if (record["status"] !== "Open") return { error: "Only an Open inquiry can be closed" };

  await updateBusinessRecord(partnerId, "service-centre-inquiry", inquiryId, {
    ...record,
    status: "Closed",
    closeReason: reason,
    closedAt: new Date().toISOString(),
  });

  revalidatePath(`/partner/${partnerId}/service-centre/inquiries`);
  // ?updated=1 -> RecordDetail's own SuccessBanner (same convention every
  // other record edit in this app uses), so closing shows a real "updated"
  // confirmation instead of the panel just silently re-rendering.
  redirect(`/partner/${partnerId}/service-centre/inquiries/${inquiryId}?updated=1`);
}

/**
 * Moves an Open inquiry to a real workorder — the call the customer accepted
 * to proceed with. Not a thin wrapper around createServiceCentreWorkorderAction:
 * that action always ends in a redirect() (via createBusinessRecordAction),
 * which would throw before this could mark the inquiry Converted — so this
 * duplicates its minimal create logic instead, in the right order: mint the
 * id, mark the inquiry Converted, THEN create the workorder and redirect.
 */
export async function convertInquiryToWorkorderAction(
  partnerId: string,
  inquiryId: string
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);

  const inquiry = await getBusinessRecord(partnerId, "service-centre-inquiry", inquiryId);
  if (!inquiry) return { error: "Inquiry not found" };
  if (inquiry["status"] !== "Open") return { error: "Only an Open inquiry can be converted" };

  const pincode = String(inquiry["pincode"] ?? "").trim();
  let city = "";
  let state = "";
  if (/^\d{6}$/.test(pincode)) {
    const match = await prisma.postalPincode.findFirst({ where: { pincode } });
    if (match) {
      city = match.district;
      state = match.state;
    }
  }

  const values: Record<string, unknown> = {
    customer: inquiry["customerName"],
    customerPhone: inquiry["customerPhone"],
    faultDescription: inquiry["complaint"],
    customerAddress: inquiry["addressLine"] ?? "",
    customerCity: city,
    customerState: state,
    customerPincode: pincode,
    brandName: inquiry["brand"] ?? "",
    modelName: inquiry["model"] ?? "",
  };

  const error = await validateServiceCentreWorkorder(values);
  if (error) {
    return {
      error: `${error} Edit the inquiry to add the missing details, then convert again.`,
    };
  }

  let jobId: string;
  try {
    jobId = await getNextNumber("service-centre.workorder", partnerId, {
      prefix: "WO",
      template: "{prefix}{yyyy}{mm}{dd}{seq}",
      sequenceDigits: 4,
    });
  } catch {
    jobId = `WO-${Date.now().toString(36).toUpperCase()}`;
  }
  const now = new Date();

  await updateBusinessRecord(partnerId, "service-centre-inquiry", inquiryId, {
    ...inquiry,
    status: "Converted",
    convertedToWorkorderId: jobId,
    convertedAt: now.toISOString(),
  });

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
    );
  }

  await createBusinessRecord(partnerId, "service-centre", {
    ...values,
    id: jobId,
    status: "Created",
    stage: "Created",
    receivedDate: now.toISOString().slice(0, 10),
    customerGstin: "",
  });

  revalidatePath(`/partner/${partnerId}/service-centre/inquiries`);
  revalidatePath(`/partner/${partnerId}/service-centre`);
  redirect(`/partner/${partnerId}/service-centre/${jobId}?created=1`);
}
