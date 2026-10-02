import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The real My Biz Flow logo mark (public/logo-mark.png), used as the source
 * for every favicon/PWA icon size. Read once and cached — these icon routes
 * are hit on every page load, so we don't want to hit disk each time.
 */
let cached: Buffer | null = null;

export function logoMarkPng(): Blob {
  if (!cached) {
    cached = readFileSync(join(process.cwd(), "public", "logo-mark.png"));
  }
  return new Blob([new Uint8Array(cached)], { type: "image/png" });
}
