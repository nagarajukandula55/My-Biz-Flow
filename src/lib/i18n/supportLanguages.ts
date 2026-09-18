/**
 * Languages supported for auto-reply answers (supportAutoReply.ts) and the
 * Help & Tutorials guide (help/page.tsx) — deliberately NOT applied to the
 * live human<->partner Support Widget chat itself, which stays English
 * only (explicit product decision: a real person typing back can't easily
 * switch languages per message, and machine-translating a live back-and-
 * forth risks mistranslating something a customer's actual money depends
 * on). This only covers fixed, pre-written content: canned auto-reply
 * text and the static Help guide.
 *
 * Adding a language: add its entry here, then add its translations to
 * supportAutoReply.ts's rules and/or help/page.tsx's HELP_SECTIONS. A
 * language can exist in one file without the other (e.g. Help has more
 * languages than auto-reply, or vice versa) — each file's own lookup
 * falls back to English for any language it doesn't have content for yet.
 */
export type SupportLanguage = "en" | "hi" | "te" | "ta" | "kn";

export const SUPPORT_LANGUAGES: { code: SupportLanguage; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
  { code: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
];

export const DEFAULT_SUPPORT_LANGUAGE: SupportLanguage = "en";
