"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { VENDOR_SESSION_COOKIE } from "@/lib/vendorSession";
import { setVendorPassword } from "@/lib/vendorData";

export async function changePasswordAction(formData: FormData) {
  const vendorId = cookies().get(VENDOR_SESSION_COOKIE)?.value;
  if (!vendorId) redirect("/login");

  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) {
    redirect("/change-password?error=too_short");
  }
  if (newPassword !== confirmPassword) {
    redirect("/change-password?error=mismatch");
  }

  await setVendorPassword(vendorId, newPassword);
  redirect(`/vendor/${vendorId}/dashboard`);
}
