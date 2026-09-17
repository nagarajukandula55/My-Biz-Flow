import { prisma } from "@/lib/prisma";
import { EMAIL_TEMPLATE_DEFS, findEmailTemplateDef, type EmailTemplateDef } from "@/lib/emailTemplateDefs";
import { SITE_NAME, SITE_URL, SUPPORT_EMAIL } from "@/lib/seo";

/**
 * Available in EVERY template's subject/heading/body/footNote regardless of
 * that template's own `variables` list — the admin editor shows these as an
 * always-present "Common" token group (see EmailTemplateEditor.tsx) on top
 * of each template's specific tokens.
 */
export function commonEmailTokens(): Record<string, string> {
  const now = new Date();
  return {
    siteName: SITE_NAME,
    supportEmail: SUPPORT_EMAIL,
    siteUrl: SITE_URL,
    currentDate: now.toISOString().slice(0, 10),
    currentYear: String(now.getFullYear()),
  };
}
export const COMMON_EMAIL_TOKEN_NAMES = ["siteName", "supportEmail", "siteUrl", "currentDate", "currentYear"];

export type EmailTemplateFields = { subject: string; heading: string; body: string; footNote?: string; bodyFormat: "text" | "html" };
export type EmailTemplateWithFields = EmailTemplateDef & EmailTemplateFields;

function defaultFields(def: EmailTemplateDef): EmailTemplateFields {
  return {
    subject: def.defaultSubject,
    heading: def.defaultHeading,
    body: def.defaultBody,
    footNote: def.defaultFootNote,
    bodyFormat: def.defaultBodyFormat ?? "text",
  };
}

/** Every template def, with its DB override fields if a row exists (else the code defaults). */
export async function listEmailTemplates(): Promise<EmailTemplateWithFields[]> {
  const rows = await prisma.emailTemplate.findMany();
  const overrides = new Map(rows.map((r) => [r.key, r]));
  return EMAIL_TEMPLATE_DEFS.map((def) => {
    const row = overrides.get(def.key);
    return {
      ...def,
      ...(row
        ? { subject: row.subject, heading: row.heading, body: row.body, footNote: row.footNote ?? undefined, bodyFormat: row.bodyFormat as "text" | "html" }
        : defaultFields(def)),
    };
  });
}

/** The fields to actually send for one template key — DB override if set, else the code default. */
export async function getEmailTemplate(key: string): Promise<EmailTemplateFields> {
  const row = await prisma.emailTemplate.findUnique({ where: { key } });
  if (row) return { subject: row.subject, heading: row.heading, body: row.body, footNote: row.footNote ?? undefined, bodyFormat: row.bodyFormat as "text" | "html" };
  const def = findEmailTemplateDef(key);
  return def ? defaultFields(def) : { subject: "", heading: "", body: "", bodyFormat: "text" };
}

/** Admin edit — persists an override. */
export async function saveEmailTemplate(key: string, fields: EmailTemplateFields): Promise<void> {
  await prisma.emailTemplate.upsert({
    where: { key },
    update: fields,
    create: { key, ...fields },
  });
}

/** Deletes the override, reverting to the code default. */
export async function resetEmailTemplate(key: string): Promise<void> {
  await prisma.emailTemplate.deleteMany({ where: { key } });
}

/** Fills {{token}} placeholders — the event-specific `vars` plus the always-available common tokens (see commonEmailTokens). Unknown/missing tokens become empty string, not left as literal "{{...}}" text. */
export function renderEmailTemplate(text: string, vars: Record<string, string>): string {
  const allVars = { ...commonEmailTokens(), ...vars };
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => allVars[key] ?? "");
}
