import type { Metadata } from "next";
import { mbfDisplay, mbfSans, mbfMono } from "@/lib/fonts";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "My Biz Flow — No-Code Business Management Platform for Service Businesses",
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
    title: "My Biz Flow — No-Code Business Management Platform for Service Businesses",
    description:
      "One platform, every module: POS, Service Centre, Billing/GST, Inventory, HRMS, Clinic and more — mix and match on one account, no custom development required.",
  },
  twitter: {
    card: "summary",
    title: "My Biz Flow — No-Code Business Management Platform for Service Businesses",
    description:
      "One platform, every module: POS, Service Centre, Billing/GST, Inventory, HRMS, Clinic and more — mix and match on one account, no custom development required.",
  },
  robots: { index: true, follow: true },
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
