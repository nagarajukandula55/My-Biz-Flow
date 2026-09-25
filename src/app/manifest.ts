import type { MetadataRoute } from "next";

/**
 * Next.js App Router's native manifest file convention — this file
 * auto-generates `/manifest.webmanifest` and Next wires the
 * `<link rel="manifest">` into every page automatically (no manual
 * metadata-export needed). This is the main app shell's manifest: the
 * marketing site + general partner dashboard, so a business owner can "Add
 * to Home Screen" the shell itself, same as the 3 existing per-module PWAs
 * (Service Centre / Telecalling / Field Force) already let staff do for
 * their own module.
 *
 * Colors are the real MBF Brand Blue tokens from globals.css's :root block
 * (light theme, the default): --bg (#F1F4F8) for background_color,
 * --accent (#1A63BD) for theme_color — not invented values.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My Biz Flow — No-Code Business Management Platform",
    short_name: "My Biz Flow",
    description:
      "Modular, no-code business management platform for Indian SMBs — POS, Service Centre, Billing, Inventory, HRMS, and more on one account.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F1F4F8",
    theme_color: "#1A63BD",
    orientation: "portrait",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
