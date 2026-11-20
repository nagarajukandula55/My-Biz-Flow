/**
 * Normalises a phone number for WhatsApp Cloud API.  Indian local mobile
 * numbers are the default throughout MBF: entering `9000528462`,
 * `09000528462`, `91 9000528462`, or `+91 9000528462` all produces the
 * E.164 digits Meta expects: `919000528462`.
 *
 * For an explicit non-Indian country code we keep the supplied digits. This
 * avoids silently rewriting international numbers while still making the
 * India-first local-number experience reliable.
 */
export function normalizeWhatsAppPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  if (/^[6-9]\d{9}$/.test(digits)) return `91${digits}`;
  if (/^0[6-9]\d{9}$/.test(digits)) return `91${digits.slice(1)}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return digits;
  return digits;
}

/** Values that may represent the same Indian number in existing records. */
export function phoneLookupVariants(value: string): string[] {
  const original = value.trim();
  const normalized = normalizeWhatsAppPhone(original);
  const variants = new Set([original, normalized]);
  if (/^91[6-9]\d{9}$/.test(normalized)) {
    const local = normalized.slice(2);
    variants.add(local);
    variants.add(`+${normalized}`);
    variants.add(`0${local}`);
  }
  return [...variants].filter(Boolean);
}

export function maskPhoneForLog(value: string): string {
  const normalized = normalizeWhatsAppPhone(value);
  return normalized.length > 4 ? `${"*".repeat(normalized.length - 4)}${normalized.slice(-4)}` : "****";
}
