"use server";

import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { assertModuleAccess, assertPageTierAccess } from "@/lib/tenant";
import { isCustomerDataUnlocked } from "@/lib/customerDataAccess";
import { listBusinessRecords } from "@/lib/businessRecords";

export async function loadCustomerExportRows(partnerId: string) {
  await requireSessionPartnerId(partnerId);
  await assertModuleAccess(partnerId, "service-centre");
  await assertPageTierAccess(partnerId, "service-centre.customers.list");
  if (!(await isCustomerDataUnlocked(partnerId))) throw new Error("Customer data is locked. Unlock it again to export.");
  return listBusinessRecords(partnerId, "service-centre-customers");
}

export async function loadInquiryExportRows(partnerId: string) {
  await requireSessionPartnerId(partnerId);
  await assertModuleAccess(partnerId, "service-centre");
  return listBusinessRecords(partnerId, "service-centre-inquiry");
}
