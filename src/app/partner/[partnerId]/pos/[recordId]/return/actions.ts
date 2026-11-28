"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePosManager, requirePosStaffAction } from "@/lib/pos/posAuth";
import { getOpenTillSession } from "@/lib/pos/posTill";
import { createPosReturn, type PosReturnLineInput } from "@/lib/pos/posReturns";
import { getBusinessRecord } from "@/lib/businessRecords";

export async function createPosReturnAction(partnerId: string, saleId: string, formData: FormData): Promise<void> {
  const staff = await requirePosStaffAction(partnerId);
  requirePosManager(staff);
  const sale = await getBusinessRecord(partnerId, "pos", saleId);
  if (!sale) throw new Error("Sale not found.");
  const locationId = String(sale["locationId"] ?? "").trim();
  const method = String(formData.get("refundMethod") ?? "");
  if (!["Cash", "UPI", "Card", "Wallet"].includes(method)) throw new Error("Select a valid refund method.");
  const refundMethod = method as "Cash" | "UPI" | "Card" | "Wallet";
  const reason = String(formData.get("reason") ?? "").trim();
  const refundReference = String(formData.get("refundReference") ?? "").trim();

  const lineIds = formData.getAll("lineId").map(String);
  const qtys = formData.getAll("qty").map((v) => Number(v));
  if (lineIds.length !== qtys.length || qtys.some((qty) => !Number.isSafeInteger(qty) || qty < 0)) {
    throw new Error("Enter a valid whole-number return quantity for every sale line.");
  }
  const lines: PosReturnLineInput[] = lineIds.map((lineId, i) => ({ lineId, qty: qtys[i] })).filter((l) => l.qty > 0);

  if (lines.length === 0) throw new Error("Enter a quantity to return for at least one line.");

  // The till session a Cash refund actually comes out of is whichever
  // session is open right now (could be a different shift than the
  // original sale's) — null if none, in which case a Cash refund just
  // isn't tracked against any session's reconciliation; reject that case
  // below instead of allowing an unaccounted drawer payout.
  const openSession = locationId ? await getOpenTillSession(staff.posAccountId, locationId) : null;
  if (refundMethod === "Cash" && !openSession) {
    throw new Error("A cash refund requires an open till at the selected outlet.");
  }

  await createPosReturn({
    partnerId,
    saleId,
    lines,
    refundMethod,
    reason,
    refundReference,
    staffId: staff.id,
    staffName: `${staff.name} (${staff.staffCode})`,
    tillSessionId: openSession?.id ?? null,
    posAccountId: staff.posAccountId,
  });

  revalidatePath(`/partner/${partnerId}/pos/${saleId}`);
  revalidatePath(`/partner/${partnerId}/pos/till`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  redirect(`/partner/${partnerId}/pos/${saleId}?updated=1`);
}
