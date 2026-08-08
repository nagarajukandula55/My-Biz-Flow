"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { VENDOR_SESSION_COOKIE } from "@/lib/vendorSession";

/** Hardcoded demo vendor — there is no real vendor lookup yet. */
const DEMO_VENDOR_ID = "demo";

export async function signInAsVendor(formData: FormData) {
  const email = String(formData.get("email") ?? "");

  // Demo stub: any non-empty email/password combination "succeeds" and
  // lands on the same hardcoded demo vendor. No password is actually
  // checked against anything real.
  cookies().set(VENDOR_SESSION_COOKIE, email || "demo@example.com", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  redirect(`/vendor/${DEMO_VENDOR_ID}/pos`);
}

/** Clears the demo vendor session cookie and returns to the public login page. */
export async function signOutAction() {
  cookies().delete(VENDOR_SESSION_COOKIE);
  redirect("/login");
}
