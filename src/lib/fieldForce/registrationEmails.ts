import { sendEmail, emailShell, emailButton, emailInfoBox } from "@/lib/email";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export async function sendFieldForceRegistrationEmail(input: {
  to?: string | null;
  name: string;
  publicId: string;
  role: "Customer" | "Service Provider";
  loginPath: string;
}): Promise<void> {
  if (!input.to) return;
  const loginUrl = `${SITE_URL}${input.loginPath}`;
  const subject = `${SITE_NAME} ${input.role} registration confirmed - ${input.publicId}`;
  const html = emailShell(`<h1 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px;">Registration confirmed</h1>${emailInfoBox([{ label: `${input.role} ID`, value: input.publicId }, { label: "Login", value: loginUrl }])}<p>Your account is ready. Use your registered phone number and password to sign in. Never share your password or OTP.</p><div style="text-align:center;margin:20px 0;">${emailButton(`Open ${input.role} login`, loginUrl)}</div>`);
  const text = `${subject}\n\n${input.role} ID: ${input.publicId}\nLogin: ${loginUrl}\n\nUse your registered phone number and password to sign in. Never share your password or OTP.`;
  await sendEmail({ to: input.to, subject, html, text });
}
