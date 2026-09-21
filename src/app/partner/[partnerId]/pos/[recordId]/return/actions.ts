"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePosStaffAction } from "@/lib/pos/posAuth";
import { getOpenTillSession } from "@/lib/pos/posTill";
import { createPosReturn, type PosReturnLineInput } from "@/lib/pos/posReturns";

export async function createPosReturnAction(partnerId: string, saleId: string, formData: FormData): Promise<void> {
  const staff = await requirePosStaffAction(partnerId);
  const locationId = String(formData.get("locationId") ?? "").trim();
  const refundMethod = String(formData.get("refundMethod") ?? "Cash") as "Cash" | "UPI" | "Card" | "Wallet";
  const reason = String(formData.get("reason") ?? "").trim();

  const skus = formData.getAll("sku").map(String);
  const qtys = formData.getAll("qty").map((v) => Number(v));
  const lines: PosReturnLineInput[] = skus.map((sku, i) => ({ sku, qty: qtys[i] || 0 })).filter((l) => l.qty > 0);

  if (lines.length === 0) throw new Error("Enter a quantity to return for at least one line.");

  // The till session a Cash refund actually comes out of is whichever
  // session is open right now (could be a different shift than the
  // original sale's) — null if none, in which case a Cash refund just
  // isn't tracked against any session's reconciliation.
  const openSession = locationId ? await getOpenTillSession(staff.posAccountId, locationId) : null;

  await createPosReturn({
    partnerId,
    saleId,
    lines,
    refundMethod,
    reason,
    staffId: staff.id,
    staffName: `${staff.name} (${staff.staffCode})`,
    tillSessionId: openSession?.id ?? null,
  });

  revalidatePath(`/partner/${partnerId}/pos/${saleId}`);
  revalidatePath(`/partner/${partnerId}/pos/till`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  redirect(`/partner/${partnerId}/pos/${saleId}?updated=1`);
}
