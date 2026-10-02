import { NextResponse } from "next/server";
import { logoMarkPng } from "@/lib/logoIcon";

/**
 * 512x512 PNG for manifest.ts's `icons` array. Serves the real logo mark
 * (public/logo-mark.png) directly. Previously generated a placeholder "M"
 * via ImageResponse/Satori.
 */
export async function GET() {
  return new NextResponse(logoMarkPng(), {
    headers: { "Content-Type": "image/png" },
  });
}
