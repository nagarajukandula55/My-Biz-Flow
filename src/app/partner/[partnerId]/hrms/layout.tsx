import type { Metadata, Viewport } from "next";

/**
 * PWA metadata for the whole HRMS subtree — same pattern as Service
 * Centre's layout.tsx. The attendance check-in flow is the part ground-
 * level employees actually use like a mobile app (geolocation check-in/
 * check-out), so this is scoped to all of HRMS (simpler than a one-off
 * layout under just attendance/) with the manifest's own start_url pointed
 * straight at the attendance page — see manifest.webmanifest/route.ts.
 */
export async function generateMetadata({ params }: { params: { partnerId: string } }): Promise<Metadata> {
  return {
    manifest: `/partner/${params.partnerId}/hrms/manifest.webmanifest`,
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "HRMS" },
  };
}

export const viewport: Viewport = { themeColor: "#0B0F19" };

export default function HrmsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
