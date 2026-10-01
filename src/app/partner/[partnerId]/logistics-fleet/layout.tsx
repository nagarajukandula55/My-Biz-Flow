import type { Metadata, Viewport } from "next";

/**
 * PWA metadata for the whole Logistics / Fleet subtree — same pattern as
 * HRMS/Service Centre's layout.tsx. Lets staff "Add to Home Screen" and get
 * a real app icon that opens straight into this partner's Logistics /
 * Fleet in standalone mode.
 */
export async function generateMetadata({ params }: { params: { partnerId: string } }): Promise<Metadata> {
  return {
    manifest: `/partner/${params.partnerId}/logistics-fleet/manifest.webmanifest`,
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Logistics / Fleet" },
    icons: { apple: [{ url: "/logo-mark.png" }] },
  };
}

export const viewport: Viewport = { themeColor: "#0B0F19" };

export default function LogisticsFleetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
