import { ImageResponse } from "next/og";

/**
 * Next.js App Router file-convention icon — auto-generates /icon and wires
 * up the matching <link rel="icon"> in every page's <head> with zero
 * metadata-export wiring needed. Rendered at request time via Satori (no
 * `sharp`/image-processing dependency required, unlike a static PNG we'd
 * have to pre-generate). Colors are the real MBF Brand Blue tokens from
 * globals.css (--bg-sunken navy / --accent blue / --accent-contrast white),
 * not invented ones.
 */
// Edge runtime avoids a Next.js/Windows dev-build bug where the Node
// runtime's static prerender of this file-convention route throws
// `TypeError: Invalid URL` resolving @vercel/og's bundled default font via
// a file:// URL. The icon-192/icon-512 custom routes below already run on
// the edge runtime for the same reason.
export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 6,
        }}
      >
        <span
          style={{
            fontSize: 20,
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
