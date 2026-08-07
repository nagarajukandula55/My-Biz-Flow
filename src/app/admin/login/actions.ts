"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, computeAdminCookieValue } from "@/lib/adminAuth";
import { env } from "@/lib/env";

export async function signInAsAdmin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin/designer");

  let secret: string | undefined;
  try {
    secret = env.superAdminSecret();
  } catch {
    secret = undefined;
  }

  if (!secret || password !== secret) {
    redirect(`/admin/login?next=${encodeURIComponent(next)}&error=1`);
  }

  cookies().set(ADMIN_COOKIE_NAME, await computeAdminCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours — a real session length choice would come with real sessions
  });

  redirect(next);
}
