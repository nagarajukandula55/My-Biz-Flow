"use server";

import { redirect } from "next/navigation";

/**
 * Demo "register your business" action. Per CLAUDE.md/DESIGN_SYSTEM.md §7,
 * signup is where a Vendor's module types get selected (a Vendor's "type"
 * is just its enabled modules — there's no separate vendor-type enum). No
 * real Vendor record is created — there is no database wired up yet — this
 * just logs the submission and redirects to login, same demo-honesty
 * pattern as every other form in this codebase.
 */
export async function registerBusiness(formData: FormData) {
  const businessName = String(formData.get("businessName") ?? "");
  const email = String(formData.get("email") ?? "");
  const modules = formData.getAll("modules").map(String);

  // eslint-disable-next-line no-console
  console.log("Signup submit (demo, no backend):", { businessName, email, modules });

  redirect("/login");
}
