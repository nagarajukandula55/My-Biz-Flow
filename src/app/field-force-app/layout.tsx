import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  manifest: "/field-force-manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Field Force" },
};

export const viewport: Viewport = { themeColor: "#0B0F19" };

export default function FieldForceAppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
