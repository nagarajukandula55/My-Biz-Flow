import { NextResponse } from "next/server";

/**
 * Per-partner PWA manifest for the HRMS module — same generated-per-
 * partnerId pattern as Service Centre's manifest.webmanifest/route.ts.
 * start_url points straight at /attendance since that's the flow ground-
 * level employees install this for (geolocation check-in/check-out), not
 * the HRMS admin list. Reuses the shared /logo-mark.png icon (same as
 * Service Centre) rather than a dedicated HRMS icon — not warranted for a
 * single attendance flow. Like Service Centre, HRMS has no separate
 * unauthenticated staff login, so this route needs no session-gate
 * exemption in middleware.
 */
export async function GET(_request: Request, { params }: { params: { partnerId: string } }) {
  const { partnerId } = params;
  const basePath = `/partner/${partnerId}/hrms`;

  return NextResponse.json(
    {
      name: "HRMS Attendance",
      short_name: "Attendance",
      description: "Check in and check out with geolocation, view leave and payroll.",
      start_url: `${basePath}/attendance`,
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
