"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createLoyaltyMember, updateLoyaltyMember, type LoyaltyMemberInput } from "@/lib/loyaltyRewards";

/** Bind with .bind(null, partnerId) before passing as a RecordForm `action` prop. */
export async function createLoyaltyMemberAction(partnerId: string, values: Record<string, unknown>) {
  partnerId = await requireSessionPartnerId(partnerId);
  const member = await createLoyaltyMember(partnerId, values as LoyaltyMemberInput);
  revalidatePath(`/partner/${partnerId}/loyalty-rewards`);
  redirect(`/partner/${partnerId}/loyalty-rewards/${member.id}?created=1`);
}

/** Bind with .bind(null, partnerId, memberId) before passing as a RecordForm `action` prop. */
export async function updateLoyaltyMemberAction(
  partnerId: string,
  memberId: string,
  values: Record<string, unknown>
) {
  partnerId = await requireSessionPartnerId(partnerId);
  await updateLoyaltyMember(partnerId, memberId, values as LoyaltyMemberInput);
  revalidatePath(`/partner/${partnerId}/loyalty-rewards`);
  revalidatePath(`/partner/${partnerId}/loyalty-rewards/${memberId}`);
  redirect(`/partner/${partnerId}/loyalty-rewards/${memberId}?updated=1`);
}
