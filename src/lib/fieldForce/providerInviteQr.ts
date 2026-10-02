import QRCode from "qrcode";

/** QR code for an engineer's self-signup link — same technique as src/lib/telegramQr.ts/upiQr.ts (the `qrcode` package, rendered to a PNG data URL) so a phone camera scan opens the signup page directly. */
export async function generateProviderInviteQrDataUrl(signupLink: string): Promise<string | null> {
  if (!signupLink?.trim()) return null;
  try {
    return await QRCode.toDataURL(signupLink, { margin: 1, width: 220 });
  } catch {
    return null;
  }
}
