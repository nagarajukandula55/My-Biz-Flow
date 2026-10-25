import { NextResponse } from "next/server";
import { logoMarkPng } from "@/lib/logoIcon";

export async function GET() {
  return new NextResponse(logoMarkPng(), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" } });
}
