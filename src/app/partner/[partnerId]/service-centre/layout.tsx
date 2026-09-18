import type { Metadata, Viewport } from "next";

/**
 * PWA metadata for the whole Service Centre subtree — mirrors Telecalling's
 * own layout.tsx. Lets staff "Add to Home Screen" and get a real app icon
 * that opens straight into this partner's Service Centre workorder list in
 * standalone mode (no browser address bar). The manifest itself is
 * generated per-partner by manifest.webmanifest/route.ts, not a static
 * /public file, so this works correctly for any Service Centre partner
 * with zero further code changes.
 */
export async function generateMetadata({ params }: { params: { partnerId: string } }): Promise<Metadata> {
  return {
    manifest: `/partner/${params.partnerId}/service-centre/manifest.webmanifest`,
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Service Centre" },
  };
}

export const viewport: Viewport = { themeColor: "#0B0F19" };

export default function ServiceCentreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
