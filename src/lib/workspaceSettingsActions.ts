"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { getVisibleModuleSlugs } from "@/lib/designer/entitlements";
import { assertPartnerCanWrite } from "@/lib/tenant";
import { canConfigureBusinessPayments, readBusinessUpiId } from "@/lib/workspacePaymentSettings";

export async function saveWorkspaceConfig(partnerId: string, form: FormData): Promise<void> {
  await requireSessionPartnerId(partnerId);
  await assertPartnerCanWrite(partnerId);
  const modules = await getVisibleModuleSlugs(partnerId);
  if (modules.includes("service-centre")) throw new Error("Use your existing Service Centre settings.");
  const text = (key: string, max: number) => {
    const value = String(form.get(key) ?? "").trim();
    if (value.length > max) throw new Error(`${key} is too long`);
    return value || null;
  };
  // Deliberately narrow: absent/hidden Service Centre fields are never cleared.
  const data = {
    ...(form.has("serviceTerms") ? { serviceTerms: text("serviceTerms", 10000) } : {}),
    ...(canConfigureBusinessPayments(modules) && form.has("upiId") ? { upiId: readBusinessUpiId(form.get("upiId")) } : {}),
    ...(modules.includes("billing") && form.has("invoiceTerms") ? { invoiceTerms: text("invoiceTerms", 10000) } : {}),
  };
  await prisma.partner.update({ where: { id: partnerId }, data });
  revalidatePath(`/partner/${partnerId}/settings`);
  redirect(`/partner/${partnerId}/settings?tab=config&saved=1`);
}
