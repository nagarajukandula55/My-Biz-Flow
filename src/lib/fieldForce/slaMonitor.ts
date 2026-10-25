import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/fieldForce/notifications";
import { sendPartnerTelegramAlert } from "@/lib/telegram";

export async function monitorFieldForceSlas(now = new Date()): Promise<{ breaches: number }> {
  const companies = await prisma.fieldForceCompany.findMany({ where: { isActive: true, OR: [{ slaResponseMinutes: { not: null } }, { slaResolutionHours: { not: null } }] }, select: { id: true, partnerId: true, name: true, slaResponseMinutes: true, slaResolutionHours: true } });
  let breaches = 0;
  for (const company of companies) {
    const bookings = await prisma.booking.findMany({ where: { partnerId: company.partnerId, companyId: company.id, status: { notIn: ["completed", "cancelled"] } }, select: { id: true, bookingNumber: true, status: true, providerId: true, createdAt: true, scheduledAt: true } });
    for (const booking of bookings) {
      const responseBreached = company.slaResponseMinutes !== null && booking.providerId === null && now.getTime() - booking.createdAt.getTime() >= company.slaResponseMinutes * 60_000;
      const resolutionBreached = company.slaResolutionHours !== null && booking.status !== "completed" && now.getTime() - booking.createdAt.getTime() >= company.slaResolutionHours * 3_600_000;
      if (!responseBreached && !resolutionBreached) continue;
      const kind = responseBreached ? "response" : "resolution";
      const type = `sla-breach-${kind}`;
      const recent = await prisma.notification.findFirst({ where: { partnerId: company.partnerId, relatedBookingId: booking.id, type, createdAt: { gte: new Date(now.getTime() - 24 * 3_600_000) } }, select: { id: true } });
      if (recent) continue;
      const label = kind === "response" ? "response" : "resolution";
      const body = `${company.name} ${label} SLA breached for booking ${booking.bookingNumber}.`;
      await notify({ partnerId: company.partnerId, audience: "ops", type, title: `Company SLA breach: ${booking.bookingNumber}`, body, relatedBookingId: booking.id });
      await sendPartnerTelegramAlert(company.partnerId, "fieldForceEvent", body);
      breaches += 1;
    }
  }
  return { breaches };
}
