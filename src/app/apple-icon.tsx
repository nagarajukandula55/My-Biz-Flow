import { ImageResponse } from "next/og";

/**
 * Next.js App Router file-convention Apple touch icon — auto-generates
 * /apple-icon and wires up <link rel="apple-touch-icon"> automatically.
 * 180x180 is Apple's recommended size. Same brand-blue treatment as
 * icon.tsx, just larger and without corner rounding (iOS applies its own
 * rounded-square mask).
 */
// See icon.tsx's comment — edge runtime avoids a Windows-only static
// prerender bug in @vercel/og's default-font resolution.
export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B1F3A",
        }}
      >
        <span
          style={{
            fontSize: 110,
            fontWeight: 800,
            color: "#FFFFFF",
            fontFamily: "sans-serif",
          }}
        >
          M
        </span>
      </div>
    ),
    { ...size }
  );
}
