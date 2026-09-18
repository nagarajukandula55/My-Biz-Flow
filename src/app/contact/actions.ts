"use server";

import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { sendRawTelegramMessage } from "@/lib/telegram";
import { contactSubmittedMessage } from "@/lib/telegramTemplates";

/**
 * Real contact-form handler: persists to `contact_submissions` (own table,
 * ops-facing, not partner-scoped — reviewed from My-Biz-Flow-Admin's
 * /admin/contact-submissions, same physical DB, mirrored model there) and
 * pings TELEGRAM_OPS_CHAT_ID so a submission is never just sitting
 * unnoticed in a table. Same "never throws" posture as every other
 * best-effort Telegram send in this app — a notification failure must
 * never fail the form.
 */
export async function submitContactForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email || !message) {
    return { ok: false, error: "Please fill in all fields." };
  }

  await prisma.contactSubmission.create({ data: { name, email, message } });

  try {
    const opsChatId = env.telegramOpsChatId();
    if (opsChatId) {
      await sendRawTelegramMessage(opsChatId, await contactSubmittedMessage({ name, email, message }));
    }
  } catch {
    // Best-effort — the submission is already saved either way.
  }

  return { ok: true };
}
