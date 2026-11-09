import type { Metadata, Viewport } from "next";
import { PwaRegistration } from "../PwaRegistration";

/** PWA metadata for just this subtree — see customer/layout.tsx's header. */
export const metadata: Metadata = {
  manifest: "/field-force-provider-manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Provider" },
};

export const viewport: Viewport = { themeColor: "#0B0F19" };

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return <><PwaRegistration />{children}</>;
}
