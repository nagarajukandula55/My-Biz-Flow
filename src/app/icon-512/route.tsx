import { ImageResponse } from "next/og";

/** 512x512 PNG for manifest.ts's `icons` array — see icon-192/route.tsx header. */
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
        <span style={{ fontSize: 320, fontWeight: 800, color: "#FFFFFF", fontFamily: "sans-serif" }}>M</span>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
