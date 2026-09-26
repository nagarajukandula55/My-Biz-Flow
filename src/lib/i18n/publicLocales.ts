/**
 * Local-language support for the PUBLIC marketing pages (homepage,
 * /pricing, /help, /help/modules). Reuses the exact same `Locale` type,
 * `LOCALES` list, `LOCALE_COOKIE` name, and cookie-based switching
 * mechanism as the Field Force self-serve dict (src/lib/i18n/locales.ts) —
 * this file only adds a second, separately-namespaced dictionary set
 * (dict-public/*.ts) and its own lookup function, so the same
 * LanguageSwitcher/cookie controls both areas without a second switching
 * mechanism being built.
 */
import { en } from "./dict-public/en";
import { hi } from "./dict-public/hi";
import { te } from "./dict-public/te";
import { ta } from "./dict-public/ta";
import { kn } from "./dict-public/kn";
import { ml } from "./dict-public/ml";
import { mr } from "./dict-public/mr";
import { bn } from "./dict-public/bn";
import { gu } from "./dict-public/gu";
import { pa } from "./dict-public/pa";
import { ur } from "./dict-public/ur";
import type { Locale } from "./locales";

export type PublicTranslationKey = keyof typeof en;

const PUBLIC_DICTS: Record<Locale, Partial<Record<PublicTranslationKey, string>>> = {
  en,
  hi,
  te,
  ta,
  kn,
  ml,
  mr,
  bn,
  gu,
  pa,
  ur,
};

/** Translates `key` in `locale` for the public marketing pages, falling
 * back to English for any missing entry (same fallback contract as
 * lib/i18n/locales.ts's `t()`). */
export function tPublic(locale: Locale, key: PublicTranslationKey, vars?: Record<string, string | number>): string {
  const template = PUBLIC_DICTS[locale]?.[key] ?? en[key] ?? key;
  if (!vars) return template;
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), template);
}
