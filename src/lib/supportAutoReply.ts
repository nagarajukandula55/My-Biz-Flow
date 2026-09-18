/**
 * Instant, no-human-needed replies for the Support Widget live chat
 * (src/components/SupportWidget.tsx / src/lib/supportTickets.ts). Keyword-
 * matched against a partner's own message — first rule whose keywords
 * appear (case-insensitive, substring match) wins, so order rules
 * most-specific-first. Deliberately NOT an LLM call: no AI API key is
 * configured anywhere in this app today, and a fixed rule set is instant,
 * free, and fully predictable — the honest tradeoff is it only covers what
 * it's explicitly told to, so a genuinely novel question still needs a
 * human reply via the ops Telegram thread as before (this never replaces
 * that path, only runs alongside it — see sendPartnerSupportMessage).
 *
 * Every `link` below points at REAL content already in this app — the
 * partner Help & Tutorials accordion (helpSectionSlug'd anchors, see
 * HelpAccordion.tsx), the public FAQ/module guide, or the Downloads page —
 * not invented URLs. SupportWidget.tsx linkifies these into clickable text.
 *
 * Extend by adding a rule here; no other file needs to change.
 */
import { helpSectionSlug } from "@/lib/helpSlug";

export type AutoReplyRule = {
  /** Any of these appearing in the message (case-insensitive) matches this rule. */
  keywords: string[];
  reply: string;
  /** Optional real path this reply points to — `{partnerId}` is substituted if present. */
  link?: string;
  linkLabel?: string;
};

function helpLink(sectionTitle: string): string {
  return `/partner/{partnerId}/help#${helpSectionSlug(sectionTitle)}`;
}

export const SUPPORT_AUTO_REPLY_RULES: AutoReplyRule[] = [
  {
    keywords: ["human", "agent", "real person", "talk to someone", "talk to a person"],
    reply: "Got it — connecting you with our team now. Someone will reply here shortly.",
  },
  {
    keywords: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"],
    reply:
      "Hi! 👋 Thanks for reaching out to My Biz Flow support. Tell us what you need help with, or check our Getting Started guide below while you wait for a reply.",
    link: helpLink("Getting started"),
    linkLabel: "Getting Started guide",
  },
  {
    keywords: ["how does this work", "what is my biz flow", "new here", "just signed up", "getting started"],
    reply: "Here's our Getting Started guide covering the overall shape of the app — modules, Settings, and where to start.",
    link: helpLink("Getting started"),
    linkLabel: "Getting Started guide",
  },
  {
    keywords: [
      "invoice",
      "billing",
      "gst",
      "tax invoice",
      "cgst",
      "sgst",
      "igst",
      "credit note",
      "debit note",
      "upi",
      "payment qr",
    ],
    reply:
      "Here's our Billing & Invoices guide — covers GST/CGST/SGST/IGST, Estimate vs Invoice vs Credit/Debit Note, and getting your logo/bank details/UPI QR onto invoices.",
    link: helpLink("Billing & Invoices"),
    linkLabel: "Billing & Invoices guide",
  },
  {
    keywords: ["cost", "how much", "upgrade", "plan", "tier", "subscription price"],
    reply: "Here's our module-by-module pricing/tier breakdown.",
    link: "/help/modules",
    linkLabel: "Module pricing guide",
  },
  {
    keywords: ["job card", "estimate", "service record", "bom", "bill of materials", "close a job", "close workorder"],
    reply:
      "Here's our Workorders guide — covers creating a job, the Job Card/Estimate/Service Record documents, where BOM pricing comes from, and closing a job into an invoice.",
    link: helpLink("Workorders (Service Centre)"),
    linkLabel: "Workorders guide",
  },
  {
    keywords: ["new repair", "new workorder", "repair job", "device", "workorder"],
    reply: "Here's our Workorders guide covering how to create and manage a repair job end to end.",
    link: helpLink("Workorders (Service Centre)"),
    linkLabel: "Workorders guide",
  },
  {
    keywords: ["brand", "model list", "solution", "fault code", "symptom code"],
    reply: "Here's our guide to Brands, Models, Solutions & Fault/Symptom Codes and what each is for.",
    link: helpLink("Brands, Models, Solutions & Fault/Symptom Codes"),
    linkLabel: "Brands/Models/Solutions guide",
  },
  {
    keywords: ["customer record", "customer list", "customer history"],
    reply: "Here's our Customers guide — how customer records work and when you'd need one.",
    link: helpLink("Customers"),
    linkLabel: "Customers guide",
  },
  {
    keywords: ["numbering", "invoice number", "prefix", "business profile", "logo", "bank details", "timezone", "currency"],
    reply: "Here's our Settings guide — Business Profile, Bank Details, Config, and customizing document numbering.",
    link: helpLink("Settings"),
    linkLabel: "Settings guide",
  },
  {
    keywords: ["telegram", "whatsapp alert", "notification not received", "not receiving", "alert not working"],
    reply:
      "Here's our Telegram Alerts guide for connecting/troubleshooting notifications. If it still looks broken after checking that, describe the issue and our team will dig in.",
    link: helpLink("Telegram Alerts"),
    linkLabel: "Telegram Alerts guide",
  },
  {
    keywords: ["reset password", "forgot password", "can't log in", "cant log in", "login issue"],
    reply: "Use \"Forgot password\" on the login page to reset it yourself — that's the fastest fix. If that doesn't work, let us know here and our team will help.",
  },
  {
    keywords: ["install app", "mobile app", "add to home screen", "download app", "pwa"],
    reply: "Here's our Downloads page with install guides for the Service Centre, Telecalling and Field Force apps.",
    link: "/downloads",
    linkLabel: "Downloads",
  },
  {
    keywords: ["custom field", "add a field", "hide a field", "designer", "admin page", "module admin"],
    reply: "Here's our FAQ — covers custom fields, module admin pages, and how the Designer works.",
    link: "/help",
    linkLabel: "FAQ",
  },
];

/** Returns the first matching rule (reply + resolved link), or null if nothing matched. */
export function matchAutoReply(message: string, partnerId: string): { text: string; link?: string; linkLabel?: string } | null {
  const lower = message.toLowerCase();
  for (const rule of SUPPORT_AUTO_REPLY_RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      return {
        text: rule.reply,
        link: rule.link?.replace("{partnerId}", partnerId),
        linkLabel: rule.linkLabel,
      };
    }
  }
  return null;
}
