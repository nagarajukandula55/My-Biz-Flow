import { prisma } from "@/lib/prisma";
import { TELEGRAM_TEMPLATE_DEFS, findTelegramTemplateDef, type TelegramTemplateDef } from "@/lib/telegramTemplateDefs";
import { SITE_NAME, SITE_URL, SUPPORT_EMAIL } from "@/lib/seo";

/**
 * Available in EVERY template's body regardless of that template's own
 * `variables` list — the admin editor shows these as an always-present
 * "Common" token group (see TelegramTemplateEditor.tsx) on top of each
 * template's specific tokens, so any template can reference the platform
 * name/support email/site link/today's date without a code change.
 */
export function commonTelegramTokens(): Record<string, string> {
  const now = new Date();
  return {
    siteName: SITE_NAME,
    supportEmail: SUPPORT_EMAIL,
    siteUrl: SITE_URL,
    currentDate: now.toISOString().slice(0, 10),
    currentYear: String(now.getFullYear()),
  };
}
export const COMMON_TELEGRAM_TOKEN_NAMES = ["siteName", "supportEmail", "siteUrl", "currentDate", "currentYear"];

export type TelegramTemplateWithBody = TelegramTemplateDef & { body: string };

/** Every template def, with its DB override body if one exists (else defaultBody). */
export async function listTelegramTemplates(): Promise<TelegramTemplateWithBody[]> {
  const rows = await prisma.telegramMessageTemplate.findMany();
  const overrides = new Map(rows.map((r) => [r.key, r.body]));
  return TELEGRAM_TEMPLATE_DEFS.map((def) => ({ ...def, body: overrides.get(def.key) ?? def.defaultBody }));
}

/** The body to actually send for one template key — DB override if set, else the code default. */
export async function getTelegramTemplateBody(key: string): Promise<string> {
  const row = await prisma.telegramMessageTemplate.findUnique({ where: { key } });
  if (row) return row.body;
  return findTelegramTemplateDef(key)?.defaultBody ?? "";
}

/** Admin edit — persists an override. Passing the exact defaultBody back removes the customization's point but is harmless (still just a stored override). */
export async function saveTelegramTemplateBody(key: string, body: string): Promise<void> {
  await prisma.telegramMessageTemplate.upsert({
    where: { key },
    update: { body },
    create: { key, body },
  });
}

/** Deletes the override, reverting to the code default. */
export async function resetTelegramTemplateBody(key: string): Promise<void> {
  await prisma.telegramMessageTemplate.deleteMany({ where: { key } });
}

/** Fills {{token}} placeholders in a template body — the event-specific `vars` plus the always-available common tokens (see commonTelegramTokens). Unknown/missing tokens become empty string, not left as literal "{{...}}" text, so a partial `vars` object never leaks placeholder syntax into a sent message. */
export function renderTelegramTemplate(body: string, vars: Record<string, string>): string {
  const allVars = { ...commonTelegramTokens(), ...vars };
  return body.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => allVars[key] ?? "");
}
