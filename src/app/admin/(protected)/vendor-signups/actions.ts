"use server";

import { revalidatePath } from "next/cache";
import { approveSignupRequest, rejectSignupRequest } from "@/lib/vendorSignupRequestsData";

export async function approveSignupRequestAction(requestId: string) {
  const vendor = await approveSignupRequest(requestId);
  revalidatePath("/admin/vendor-signups");
  return vendor.id;
}

export async function rejectSignupRequestAction(requestId: string) {
  await rejectSignupRequest(requestId);
  revalidatePath("/admin/vendor-signups");
}
