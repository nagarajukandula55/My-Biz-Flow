import { NextResponse } from "next/server";
export function GET(_request: Request, { params }: { params: { partnerId: string } }) {
  const start = `/partner/${encodeURIComponent(params.partnerId)}/hrms/employee`;
  return NextResponse.json({ name: "My Biz Flow — Employee attendance", short_name: "Attendance", id: start, start_url: start,
    scope: `/partner/${encodeURIComponent(params.partnerId)}/hrms/`, display: "standalone", icons: [{ src: "/logo-mark.png", sizes: "512x512", type: "image/png" }] },
    { headers: { "Content-Type": "application/manifest+json" } });
}
