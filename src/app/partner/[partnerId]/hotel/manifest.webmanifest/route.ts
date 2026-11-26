import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: { partnerId: string } }) {
  const basePath = `/partner/${params.partnerId}/hotel`;
  return NextResponse.json({
    name: "Hotel Desk - My Biz Flow",
    short_name: "Hotel Desk",
    description: "Hotel reservations, room operations, and guest folios.",
    start_url: basePath,
    scope: basePath,
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    background_color: "#F5F7FB",
    theme_color: "#1A63BD",
    icons: [{ src: "/logo-mark.png", sizes: "any", type: "image/png", purpose: "any maskable" }],
  }, { headers: { "Content-Type": "application/manifest+json" } });
}
