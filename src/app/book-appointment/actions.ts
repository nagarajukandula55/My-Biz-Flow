"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createBusinessRecord } from "@/lib/businessRecords";
import { findPartnerForInquiry } from "@/lib/serviceCentreInquiryAssignment";
import { sendPartnerTelegramAlert, sendRawTelegramMessage } from "@/lib/telegram";
import { inquiryAssignedMessage, inquiryUnassignedMessage } from "@/lib/telegramTemplates";
import { serviceTypeLabel } from "@/lib/serviceTypes";
import { getOpsChatId } from "@/lib/platformSettings";

/**
 * Public, no-login "Book Appointment" submit — the customer never picks a
 * partner directly (there's no partner directory to browse); this resolves
 * one server-side by area, same pincode -> city -> state fallback order as
 * /track's lookup is generous about matching. A miss (no partner covers
 * this area for the chosen service type yet) redirects back with an error
 * rather than silently creating an orphaned, unassigned inquiry — every
 * BusinessRecord is tenant-scoped by partnerId, so there is no "unassigned
 * pool" to put it in.
 */
export async function bookAppointmentAction(formData: FormData): Promise<void> {
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const serviceType = String(formData.get("serviceType") ?? "").trim();
  const complaint = String(formData.get("complaint") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();
  const addressLine = String(formData.get("addressLine") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();

  if (!customerName || !customerPhone || !serviceType || !complaint || !/^\d{6}$/.test(pincode)) {
    redirect(`/book-appointment?error=missing`);
  }

  const pincodeRow = await prisma.postalPincode.findFirst({ where: { pincode } });
  const city = pincodeRow?.district;
  const state = pincodeRow?.state;

  const match = await findPartnerForInquiry({ serviceType, pincode, city, state });
  if (!match) {
    // No partner covers this area/service type yet — persist it (own
    // table, not BusinessRecord, since there's no partner to scope it to)
    // so Super Admin has a real queue to review and route manually,
    // rather than the request just vanishing behind a "call us" message.
    await prisma.unassignedInquiry.create({
      data: { customerName, customerPhone, serviceType, complaint, pincode, addressLine, brand, model },
    });

    const opsChatId = await getOpsChatId();
    if (opsChatId) {
      await sendRawTelegramMessage(
        opsChatId,
        await inquiryUnassignedMessage({
          customerName,
          customerPhone,
          serviceType: serviceTypeLabel(serviceType),
          pincode,
          complaint,
        })
      );
    }

    redirect(`/book-appointment?error=no_coverage`);
  }

  const record = await createBusinessRecord(match.partner.id, "service-centre-inquiry", {
    customerName,
    customerPhone,
    serviceType,
    complaint,
    pincode,
    addressLine,
    brand,
    model,
    status: "Open",
    source: "Public Booking",
    createdAt: new Date().toISOString(),
  });

  await sendPartnerTelegramAlert(
    match.partner.id,
    "inquiryAssigned",
    await inquiryAssignedMessage({
      partnerBusinessName: match.partner.businessName,
      inquiryNumber: String(record.id),
      customerName,
      customerPhone,
      serviceType: serviceTypeLabel(serviceType),
      complaint,
    })
  );

  redirect(`/book-appointment/confirmed?ref=${encodeURIComponent(String(record.id))}&business=${encodeURIComponent(match.partner.businessName)}`);
}
