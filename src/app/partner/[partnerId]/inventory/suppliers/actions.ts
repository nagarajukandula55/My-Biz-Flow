"use server";

import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createBusinessRecord } from "@/lib/businessRecords";
import { revalidatePath } from "next/cache";

export async function createSupplierAction(partnerId: string, formData: FormData) {
  await requireSessionPartnerId(partnerId);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Supplier name is required.");
  await createBusinessRecord(partnerId, "inventory-supplier", {
    name,
    contactName: String(formData.get("contactName") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    gstin: String(formData.get("gstin") ?? "").trim(),
    paymentTermsDays: Number(formData.get("paymentTermsDays") ?? 0),
    status: "Active",
    createdAt: new Date().toISOString(),
  });
  revalidatePath(`/partner/${partnerId}/inventory/suppliers`);
}
