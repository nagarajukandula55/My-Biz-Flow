"use server";

/**
 * Demo contact-form handler — no email service is wired up, so this just
 * logs and returns success, consistent with every other "no backend yet"
 * form in this codebase (RecordForm's demo-save pattern, the admin login
 * caveat, etc.). Replace with a real transactional-email integration
 * before launch.
 */
export async function submitContactForm(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const message = String(formData.get("message") ?? "");
  // eslint-disable-next-line no-console
  console.log("[demo contact form]", { name, email, message });
  return { ok: true };
}
