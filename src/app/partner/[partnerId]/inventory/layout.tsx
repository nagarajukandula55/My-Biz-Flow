import type { Metadata, Viewport } from "next";

/**
 * PWA metadata for the whole Inventory subtree — same pattern as HRMS/
 * Service Centre's layout.tsx. Lets staff "Add to Home Screen" and get a
 * real app icon that opens straight into this partner's Inventory in
 * standalone mode.
 */
export async function generateMetadata({ params }: { params: { partnerId: string } }): Promise<Metadata> {
  return {
    manifest: `/partner/${params.partnerId}/inventory/manifest.webmanifest`,
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Inventory" },
    icons: { apple: [{ url: "/logo-mark.png" }] },
  };
}

export const viewport: Viewport = { themeColor: "#0B0F19" };

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
