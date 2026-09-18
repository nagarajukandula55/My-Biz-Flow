import { NextResponse } from "next/server";

/**
 * Per-partner PWA manifest for the Service Centre module — same generated-
 * per-partnerId pattern as Telecalling's own manifest.webmanifest/route.ts.
 * Unlike Telecalling, Service Centre has no separate unauthenticated staff
 * login (it's reached through the normal partner login), so this route
 * needs no session-gate exemption — it's only ever fetched by an already
 * signed-in browser.
 */
export async function GET(_request: Request, { params }: { params: { partnerId: string } }) {
  const { partnerId } = params;
  const basePath = `/partner/${partnerId}/service-centre`;

  return NextResponse.json(
    {
      name: "Service Centre",
      short_name: "Service Centre",
      description: "Workorders, inquiries, and billing for a repair/service centre.",
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
