import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "My Biz Flow — No-Code Business Management Platform for Every Business";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Site-wide default social-share image, via Next.js's special-file
 * convention (any page without its own opengraph-image.tsx inherits this
 * one automatically — no per-page wiring needed). Generated at request
 * time with next/og's ImageResponse rather than a static designed asset,
 * since ImageResponse's Satori renderer can't read this app's CSS custom
 * properties — colors below are literal hex, copied from globals.css's
 * dark-mode --sidebar-bg/--accent tokens (matches the login page's brand
 * panel) rather than invented, per DESIGN_SYSTEM.md.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A1526",
          color: "#F1F4F8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700 }}>My Biz Flow</div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 34, color: "#4E9CF0", fontWeight: 600 }}>
          One platform. Every business you run.
        </div>
        <div style={{ display: "flex", marginTop: 20, fontSize: 24, color: "#9AA7B8" }}>
          No-code · POS · Service Centre · Telecalling · Field Force · Billing · Inventory
        </div>
      </div>
    ),
    { ...size }
  );
}
