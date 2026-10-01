import { NextResponse } from "next/server";

/**
 * Per-partner PWA manifest for the Salon & Spa module — same generated-per-
 * partnerId pattern as HRMS/Service Centre's manifest.webmanifest/route.ts.
 * No separate unauthenticated staff login, so this route needs no
 * session-gate exemption in middleware.
 */
export async function GET(_request: Request, { params }: { params: { partnerId: string } }) {
  const { partnerId } = params;
  const basePath = `/partner/${partnerId}/salon-spa`;

  return NextResponse.json(
    {
      name: "Salon & Spa",
      short_name: "Salon & Spa",
      description: "Beauty/personal-care bookings — service menu, stylist assignment, appointment scheduling.",
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
