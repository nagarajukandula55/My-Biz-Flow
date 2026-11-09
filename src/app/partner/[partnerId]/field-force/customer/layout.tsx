import type { Metadata, Viewport } from "next";
import { PwaRegistration } from "../PwaRegistration";

/** PWA metadata for just this subtree — installable on a phone home screen
 * independent of whether it's reached via the main CRM domain or a
 * standalone Field Force deployment (see src/middleware.ts). */
export const metadata: Metadata = {
  manifest: "/field-force-customer-manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Customer" },
};

export const viewport: Viewport = { themeColor: "#0B0F19" };

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <><PwaRegistration />{children}</>;
}
