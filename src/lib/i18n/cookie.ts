/**
 * Locale preference for the pre-login Field Force signup/login pages
 * (nothing to attach a Customer/Provider preferredLanguage to yet). Once
 * logged in, Customer.preferredLanguage/Provider.preferredLanguage take over.
 */
import { cookies } from "next/headers";
import { isSupportedLocale, LOCALE_COOKIE, type Locale } from "./locales";

export function getLocaleFromCookie(): Locale {
  const value = cookies().get(LOCALE_COOKIE)?.value;
  return value && isSupportedLocale(value) ? value : "en";
}
