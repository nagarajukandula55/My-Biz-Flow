"use server";

import { revalidatePath } from "next/cache";
import { getBusinessRecord, updateBusinessRecord } from "@/lib/businessRecords";
import type { AccessScope } from "@/lib/sample-data/brand";

/** Sets a partner User's cross-location access scope — patches the generic `users` BusinessRecord (same store, different moduleSlug), editable here from the Brand record's detail page. */
export async function setUserAccessScopeAction(
  partnerId: string,
  userId: string,
  accessScope: AccessScope,
  brandRecordId: string
): Promise<void> {
  const user = await getBusinessRecord(partnerId, "users", userId);
  if (!user) return;
  await updateBusinessRecord(partnerId, "users", userId, { ...user, accessScope });
  revalidatePath(`/partner/${partnerId}/brand/${brandRecordId}`);
}
