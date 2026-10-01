import type { Metadata, Viewport } from "next";

/**
 * PWA metadata for the whole AMC / Field Service subtree — same pattern as
 * HRMS/Service Centre's layout.tsx. Lets staff "Add to Home Screen" and get
 * a real app icon that opens straight into this partner's AMC / Field Service
 * module in standalone mode (no browser address bar). The manifest itself
 * is generated per-partner by manifest.webmanifest/route.ts. Also sets the
 * iOS apple-touch-icon (missing on the first four modules that used this
 * pattern), so iOS "Add to Home Screen" picks up this module's own icon
 * instead of falling back to the generic root icon.
 */
export async function generateMetadata({ params }: { params: { partnerId: string } }): Promise<Metadata> {
  return {
    manifest: `/partner/${params.partnerId}/amc-field-service/manifest.webmanifest`,
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "AMC/Field Service" },
    icons: { apple: [{ url: "/logo-mark.png" }] },
  };
}

export const viewport: Viewport = { themeColor: "#0B0F19" };

export default function AmcFieldServiceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
