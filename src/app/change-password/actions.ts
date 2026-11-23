"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PARTNER_SESSION_COOKIE, verifyPartnerSessionToken } from "@/lib/partnerSession";
import { getPartner, setPartnerPassword } from "@/lib/partnerData";
import { getPartnerHomePath } from "@/lib/partnerHome";
import { prisma } from "@/lib/prisma";

export async function changePasswordAction(formData: FormData) {
  const partnerId = await verifyPartnerSessionToken(cookies().get(PARTNER_SESSION_COOKIE)?.value);
  if (!partnerId) redirect("/login");

  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) {
    redirect("/change-password?error=too_short");
  }
  if (newPassword !== confirmPassword) {
    redirect("/change-password?error=mismatch");
  }

  await setPartnerPassword(partnerId, newPassword);

  const partner = await getPartner(partnerId);
  const dealerRelationship = await prisma.distributorDealerRelationship.findUnique({ where: { dealerPartnerId: partnerId }, select: { id: true } });
  if (dealerRelationship && partner?.subscriptionStatus !== "Active") redirect(`/partner/${partnerId}/admin/subscription`);
  redirect(partner ? await getPartnerHomePath(partner) : `/partner/${partnerId}/dashboard`);
}
