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
 * Extend by adding a rule here; no other file needs to change.
 */
export type AutoReplyRule = {
  /** Any of these appearing in the message (case-insensitive) matches this rule. */
  keywords: string[];
  reply: string;
};

export const SUPPORT_AUTO_REPLY_RULES: AutoReplyRule[] = [
  {
    keywords: ["human", "agent", "real person", "talk to someone", "talk to a person"],
    reply: "Got it — connecting you with our team now. Someone will reply here shortly.",
  },
  {
    keywords: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"],
    reply:
      "Hi! 👋 Thanks for reaching out to My Biz Flow support. Tell us what you need help with and our team will follow up here shortly.",
  },
  {
    keywords: ["price", "pricing", "cost", "how much"],
    reply:
      "You can see our full pricing at /pricing on the site. If you have a specific question about your plan or an upgrade, let us know here and we'll help directly.",
  },
  {
    keywords: ["invoice", "billing", "payment", "receipt"],
    reply:
      "For invoice/billing questions, you can check Billing → Invoices in your dashboard for the full record. If something looks wrong there, describe the issue here and our team will look into it.",
  },
  {
    keywords: ["reset password", "forgot password", "can't log in", "cant log in", "login issue"],
    reply:
      "Use \"Forgot password\" on the login page to reset it yourself — that's the fastest fix. If that doesn't work, let us know here and our team will help.",
  },
  {
    keywords: ["whatsapp", "telegram not working", "alert not received", "not receiving"],
    reply:
      "Sorry about that — for connection issues with Telegram/WhatsApp alerts, check Settings → Notifications first. If it still looks broken, tell us what's not arriving and our team will dig in.",
  },
];

/** Returns the first matching rule's reply, or null if nothing matched. */
export function matchAutoReply(message: string): string | null {
  const lower = message.toLowerCase();
  for (const rule of SUPPORT_AUTO_REPLY_RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) return rule.reply;
  }
  return null;
}
