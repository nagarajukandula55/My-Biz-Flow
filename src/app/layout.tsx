import type { Metadata, Viewport } from "next";
import { mbfDisplay, mbfSans, mbfMono } from "@/lib/fonts";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";

// Next.js 14's `viewport` export is separate from `metadata` (theme-color
// moved out of the metadata object in Next 14's API). Matches manifest.ts's
// theme_color (--accent, #1A63BD) — the real MBF Brand Blue token.
export const viewport: Viewport = {
  themeColor: "#1A63BD",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  // icon.tsx / apple-icon.tsx (App Router file conventions) already inject
  // the matching <link> tags automatically; this explicit block is kept in
  // sync with them so favicon/apple-touch-icon/shortcut intent is also
  // discoverable straight from the metadata export.
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/apple-icon", type: "image/png" }],
    shortcut: ["/icon"],
  },
  metadataBase: new URL(SITE_URL),
  title: {
    default: "My Biz Flow — No-Code Business Management Platform for Every Business",
    template: "%s | My Biz Flow",
  },
  description:
    "My Biz Flow is a modular, no-code business management platform for Indian SMBs — mix and match POS, Service Centre workorders, GST billing, inventory, and more modules on one account, all config-driven with no custom development required.",
  keywords: [
    "no-code business management software",
    "multi-vertical CRM platform",
    "service centre software India",
    "workorder management software",
    "GST billing software",
    "modular business software",
    "POS and service centre software",
    "business management software for SMBs India",
  ],
  applicationName: "My Biz Flow",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "My Biz Flow",
    title: "My Biz Flow — No-Code Business Management Platform for Every Business",
    description:
      "One platform, every module: POS, Service Centre, Telecalling, Field Force, Billing/GST, Inventory, Clinic and more — mix and match on one account, no custom development required.",
  },
  twitter: {
    card: "summary_large_image",
    title: "My Biz Flow — No-Code Business Management Platform for Every Business",
    description:
      "One platform, every module: POS, Service Centre, Telecalling, Field Force, Billing/GST, Inventory, Clinic and more — mix and match on one account, no custom development required.",
  },
  robots: { index: true, follow: true },
  // Google Search Console ownership verification (HTML tag method) — Next.js
  // renders this as <meta name="google-site-verification" content="..." />
  // in <head> automatically. Safe to keep permanently; Google only checks
  // this tag during verification, it has no other effect afterward.
  verification: { google: "8Xq7s6UkCtsqaTxSrLlEvsJbFByWRiwYGeSX6bpALQg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${mbfDisplay.variable} ${mbfSans.variable} ${mbfMono.variable}`}>
      <head>
        {/* Applies a saved light/dark choice (see ThemeToggle) before first
            paint, so there's no flash of the wrong theme on load. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("mbf-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
