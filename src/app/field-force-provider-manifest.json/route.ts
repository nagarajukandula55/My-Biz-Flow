import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    name: "My Biz Flow Provider",
    short_name: "Provider",
    description: "Receive and manage assigned service jobs.",
    start_url: "/field-force-app",
    scope: "/",
    display: "standalone",
    background_color: "#F1F4F8",
    theme_color: "#1A63BD",
    orientation: "portrait",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
