import { NextResponse } from "next/server";

/**
 * Per-partner PWA manifest for the Wholesale / Distributor B2B module —
 * same generated-per-partnerId pattern as HRMS/Service Centre's
 * manifest.webmanifest/route.ts. No separate unauthenticated staff login,
 * so this route needs no session-gate exemption in middleware.
 */
export async function GET(_request: Request, { params }: { params: { partnerId: string } }) {
  const { partnerId } = params;
  const basePath = `/partner/${partnerId}/wholesale-b2b`;

  return NextResponse.json(
    {
      name: "Wholesale / Distributor B2B",
      short_name: "Wholesale B2B",
      description: "Bulk pricing, dealer/distributor accounts, credit terms.",
      start_url: basePath,
      scope: basePath,
      display: "standalone",
      background_color: "#0B0F19",
      theme_color: "#0B0F19",
      orientation: "portrait",
      icons: [{ src: "/logo-mark.png", sizes: "any", type: "image/png", purpose: "any maskable" }],
    },
    { headers: { "Content-Type": "application/manifest+json" } }
  );
}
