"use server";

/**
 * Demo password-reset request — no email service is wired up, so this
 * just logs and returns success, same honest-demo pattern as the login
 * and signup Server Actions. Replace with a real transactional-email +
 * token flow once auth (NextAuth) is built.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  // eslint-disable-next-line no-console
  console.log("[demo password reset]", { email });
  return { ok: true };
}
