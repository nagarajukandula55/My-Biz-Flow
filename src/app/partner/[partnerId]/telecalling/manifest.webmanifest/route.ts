import { NextResponse } from "next/server";

/**
 * Per-partner PWA manifest for the Telecalling module — generated from the
 * URL's own partnerId instead of the single static public/telecalling-*.json
 * this replaced (which hardcoded partner CC0001, the only Telecalling
 * partner that existed at the time). Any future Telecalling partner
 * (CC0002, CC0003, ...) gets a correctly-scoped installable app automatically,
 * with no code change — this route is the one and only place the manifest's
 * content is produced.
 *
 * Reachable with no session (an agent installs this from the un-authenticated
 * /telecalling/login page before they've ever signed in) — see
 * PartnerLayout's STAFF_AUTH_ROUTE_SUFFIXES, which exempts this exact path
 * from the partner-session gate for that reason.
 */
export async function GET(_request: Request, { params }: { params: { partnerId: string } }) {
  const { partnerId } = params;
  const basePath = `/partner/${partnerId}/telecalling`;

  return NextResponse.json(
    {
      name: "Telecalling",
      short_name: "Telecalling",
      description: "Call queue, click-to-call, and message templates for telecalling agents.",
      start_url: `${basePath}/login`,
      scope: basePath,
      display: "standalone",
      background_color: "#0B0F19",
      theme_color: "#0B0F19",
      orientation: "portrait",
      icons: [{ src: "/telecalling-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
    },
    { headers: { "Content-Type": "application/manifest+json" } }
  );
}
