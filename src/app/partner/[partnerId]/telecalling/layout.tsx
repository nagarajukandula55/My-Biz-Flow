import type { Metadata, Viewport } from "next";

/**
 * PWA metadata for the whole Telecalling subtree — mirrors Field Force's
 * per-role layout (see field-force/provider/layout.tsx). Lets an agent
 * "Add to Home Screen" on their phone and get a real app icon that opens
 * straight into public/telecalling-manifest.json's start_url in standalone
 * mode (no browser address bar), instead of a bookmark inside the browser.
 *
 * public/telecalling-manifest.json's start_url/scope are hardcoded to
 * partner CC0001 — the only Telecalling partner that exists today (see
 * scripts/create-internal-telecalling-partner.ts). If a second Telecalling
 * partner is ever onboarded, this manifest needs to become per-partner
 * (a dynamic route handler generating it from params.partnerId) instead of
 * this single static /public file.
 */
export const metadata: Metadata = {
  manifest: "/telecalling-manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Telecalling" },
};

export const viewport: Viewport = { themeColor: "#0B0F19" };

export default function TelecallingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
