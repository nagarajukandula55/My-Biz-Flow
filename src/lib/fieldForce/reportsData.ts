import { prisma } from "@/lib/prisma";

export type FieldForceReport = {
  totalBookings: number;
  statusCounts: Record<string, number>;
  assignedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  grossValue: number;
  paidValue: number;
  providerCount: number;
  availableProviderCount: number;
  verifiedProviderCount: number;
  companiesWithSla: number;
};

export async function getFieldForceReport(partnerId: string): Promise<FieldForceReport> {
  const [bookings, providers, companies] = await Promise.all([
    prisma.booking.findMany({ where: { partnerId }, select: { status: true, priceAmount: true, finalPrice: true, paymentStatus: true, providerId: true } }),
    prisma.provider.findMany({ where: { partnerId }, select: { isAvailable: true, verificationStatus: true } }),
    prisma.fieldForceCompany.findMany({ where: { partnerId }, select: { slaResponseMinutes: true, slaResolutionHours: true } }),
  ]);
  const statusCounts: Record<string, number> = {};
  for (const booking of bookings) statusCounts[booking.status] = (statusCounts[booking.status] ?? 0) + 1;
  return {
    totalBookings: bookings.length,
    statusCounts,
    assignedBookings: bookings.filter((b) => Boolean(b.providerId)).length,
    completedBookings: statusCounts.completed ?? 0,
    cancelledBookings: statusCounts.cancelled ?? 0,
    grossValue: bookings.reduce((sum, b) => sum + (b.finalPrice ?? b.priceAmount), 0),
    paidValue: bookings.filter((b) => b.paymentStatus === "paid").reduce((sum, b) => sum + (b.finalPrice ?? b.priceAmount), 0),
    providerCount: providers.length,
    availableProviderCount: providers.filter((p) => p.isAvailable).length,
    verifiedProviderCount: providers.filter((p) => p.verificationStatus === "verified").length,
    companiesWithSla: companies.filter((c) => c.slaResponseMinutes !== null || c.slaResolutionHours !== null).length,
  };
}
