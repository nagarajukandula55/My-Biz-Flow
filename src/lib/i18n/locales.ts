/**
 * Local-language support for the Field Force Customer/Provider self-serve
 * pages only (signup, login, booking, dashboard, job offers, notifications)
 * — not the partner-staff or Super Admin screens, which stay English-only
 * for this pass. No external i18n library — a small dictionary + lookup,
 * matching this repo's "don't add a package for something this small"
 * posture. Adding language #12 later means adding one more dict file here,
 * not restructuring.
 *
 * Translation quality caveat: every dictionary other than English is
 * AI-generated, not reviewed by a native speaker. Good enough to unblock a
 * ground-level worker who can't read English at all — get a native-speaker
 * review pass before relying on exact wording for anything legal/financial.
 */
import { en } from "./dict/en";
import { hi } from "./dict/hi";
import { te } from "./dict/te";
import { ta } from "./dict/ta";
import { kn } from "./dict/kn";
import { ml } from "./dict/ml";
import { mr } from "./dict/mr";
import { bn } from "./dict/bn";
import { gu } from "./dict/gu";
import { pa } from "./dict/pa";
import { ur } from "./dict/ur";

export type Locale = "en" | "hi" | "te" | "ta" | "kn" | "ml" | "mr" | "bn" | "gu" | "pa" | "ur";

/** Cookie name for the pre-login locale preference — declared here (not in
 * cookie.ts) so client components like LanguageSwitcher can import it
 * without pulling in next/headers. */
export const LOCALE_COOKIE = "mbf_ff_locale";
export type TranslationKey = keyof typeof en;

export const LOCALES: { code: Locale; nativeName: string; rtl?: boolean }[] = [
  { code: "en", nativeName: "English" },
  { code: "hi", nativeName: "हिन्दी" },
  { code: "te", nativeName: "తెలుగు" },
  { code: "ta", nativeName: "தமிழ்" },
  { code: "kn", nativeName: "ಕನ್ನಡ" },
  { code: "ml", nativeName: "മലയാളം" },
  { code: "mr", nativeName: "मराठी" },
  { code: "bn", nativeName: "বাংলা" },
  { code: "gu", nativeName: "ગુજરાતી" },
  { code: "pa", nativeName: "ਪੰਜਾਬੀ" },
  { code: "ur", nativeName: "اردو", rtl: true },
];

const DICTS: Record<Locale, Partial<Record<TranslationKey, string>>> = { en, hi, te, ta, kn, ml, mr, bn, gu, pa, ur };

export function isRtl(locale: Locale): boolean {
  return LOCALES.find((l) => l.code === locale)?.rtl ?? false;
}

export function isSupportedLocale(value: string): value is Locale {
  return LOCALES.some((l) => l.code === value);
}

/** Translates `key` in `locale`, falling back to English for any missing entry. */
export function t(locale: Locale, key: TranslationKey, vars?: Record<string, string | number>): string {
  const template = DICTS[locale]?.[key] ?? en[key] ?? key;
  if (!vars) return template;
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), template);
}
