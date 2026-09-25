import { ImageResponse } from "next/og";

/**
 * 192x192 PNG for manifest.ts's `icons` array (the PWA install-prompt/home-
 * screen size Chrome/Android expects). A custom route rather than the
 * icon.tsx file convention because that convention only produces one
 * request-time image per file — we need distinct 192/512/maskable sizes for
 * the manifest, generated with the same Satori/ImageResponse approach (no
 * `sharp` or other image-processing dependency needed).
 */
export const runtime = "edge";

export async function GET() {
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
        <span style={{ fontSize: 120, fontWeight: 800, color: "#FFFFFF", fontFamily: "sans-serif" }}>M</span>
      </div>
    ),
    { width: 192, height: 192 }
  );
}
