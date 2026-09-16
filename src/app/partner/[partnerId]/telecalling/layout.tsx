import type { Metadata, Viewport } from "next";

/**
 * PWA metadata for the whole Telecalling subtree — mirrors Field Force's
 * per-role layout (see field-force/provider/layout.tsx). Lets an agent
 * "Add to Home Screen" on their phone and get a real app icon that opens
 * straight into their own partner's login in standalone mode (no browser
 * address bar), instead of a bookmark inside the browser.
 *
 * The manifest itself is generated per-partner by
 * manifest.webmanifest/route.ts (from this same params.partnerId), not a
 * static /public file — so this works correctly for CC0001, CC0002, or any
 * future Telecalling partner with zero further code changes.
 */
export async function generateMetadata({ params }: { params: { partnerId: string } }): Promise<Metadata> {
  return {
    manifest: `/partner/${params.partnerId}/telecalling/manifest.webmanifest`,
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Telecalling" },
  };
}

export const viewport: Viewport = { themeColor: "#0B0F19" };

export default function TelecallingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
