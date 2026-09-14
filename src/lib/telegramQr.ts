import QRCode from "qrcode";

/**
 * QR code for the Telegram "Connect" deep link — same technique as
 * src/lib/upiQr.ts / src/lib/trackingQr.ts (the `qrcode` package already in
 * package.json, rendered to a PNG data URL), so scanning it with a phone
 * camera opens Telegram straight to the bot's /start<slot> deep link built
 * by buildTelegramConnectLink() in src/lib/telegram.ts. No new dependency,
 * no external image service.
 */
export async function generateTelegramConnectQrDataUrl(connectLink: string): Promise<string | null> {
  if (!connectLink?.trim()) return null;
  try {
    return await QRCode.toDataURL(connectLink, { margin: 1, width: 200 });
  } catch {
    // A QR that fails to generate must not take the whole page down — the
    // plain link button still works without it.
    return null;
  }
}
