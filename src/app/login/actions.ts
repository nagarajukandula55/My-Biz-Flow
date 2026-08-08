"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { VENDOR_SESSION_COOKIE } from "@/lib/vendorSession";
import { findVendorByLoginIdentifier, verifyVendorPassword } from "@/lib/vendorData";

/**
 * Real vendor login: looks a vendor up by their public VND#### id OR their
 * registered login contact number (never the internal BIZ###-VND#### key
 * — see vendorData.ts), verifies the password hash, and sets the session
 * cookie to their real vendor id. If mustChangePassword is still set
 * (true for every account until their first password change — signup
 * never collects one, see /signup), routes to /change-password instead
 * of the dashboard. Route-level enforcement that a request to
 * /vendor/[vendorId]/* actually matches the signed-in cookie doesn't
 * exist yet — this only covers the login handshake itself, same
 * demo-honesty scoping as every other pass in this codebase.
 */
export async function signInAsVendor(formData: FormData) {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const vendor = await findVendorByLoginIdentifier(identifier);
  if (!vendor || !(await verifyVendorPassword(vendor.id, password))) {
    redirect("/login?error=invalid_credentials");
  }

  cookies().set(VENDOR_SESSION_COOKIE, vendor.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  if (vendor.mustChangePassword) {
    redirect("/change-password");
  }

  redirect(`/vendor/${vendor.id}/dashboard`);
}

/** Clears the vendor session cookie and returns to the public login page. */
export async function signOutAction() {
  cookies().delete(VENDOR_SESSION_COOKIE);
  redirect("/login");
}
