import type { Metadata, Viewport } from "next";

/**
 * PWA metadata for the whole Wholesale B2B subtree — same pattern as HRMS/
 * Service Centre's layout.tsx. Lets staff "Add to Home Screen" and get a
 * real app icon that opens straight into this partner's Wholesale B2B in
 * standalone mode.
 */
export async function generateMetadata({ params }: { params: { partnerId: string } }): Promise<Metadata> {
  return {
    manifest: `/partner/${params.partnerId}/wholesale-b2b/manifest.webmanifest`,
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Wholesale B2B" },
    icons: { apple: [{ url: "/logo-mark.png" }] },
  };
}

export const viewport: Viewport = { themeColor: "#0B0F19" };

export default function WholesaleB2bLayout({ children }: { children: React.ReactNode }) {
  return children;
}
