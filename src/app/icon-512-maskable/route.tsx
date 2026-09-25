import { ImageResponse } from "next/og";

/**
 * 512x512 "maskable" PNG for manifest.ts's `icons` array — Android applies
 * its own shape mask (circle/squircle/rounded-square) to a maskable icon, so
 * the safe content must sit inside the inner ~80% "safe zone" with the
 * background color filling the full canvas (no transparency), per the W3C
 * maskable-icon spec. Same brand-blue mark as icon-512, just padded down.
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
        <span style={{ fontSize: 220, fontWeight: 800, color: "#FFFFFF", fontFamily: "sans-serif" }}>M</span>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
