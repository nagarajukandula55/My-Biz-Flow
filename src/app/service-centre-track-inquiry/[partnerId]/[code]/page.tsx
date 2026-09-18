import Link from "next/link";
import { notFound } from "next/navigation";
import { registerPage } from "@/lib/designer/registry";
import { getBusinessRecord } from "@/lib/businessRecords";
import { getPartner } from "@/lib/partnerData";
import { serviceTypeLabel } from "@/lib/serviceTypes";

/**
 * Public, unauthenticated Inquiry/Appointment status tracker — the
 * Inquiry-side equivalent of /service-centre-track/[partnerId]/[code]
 * (which only covers Workorders). A customer who booked via
 * /book-appointment or was logged as an inquiry can check whether it's
 * still Open, was Converted to a real workorder (in which case this links
 * straight to that workorder's own tracker), or was Closed (with the
 * reason shown, same as the partner sees it).
 */
registerPage({
  id: "service-centre.track-inquiry",
  moduleSlug: "service-centre",
  title: "Track Inquiry — Public",
  path: "/service-centre-track-inquiry/[partnerId]/[code]",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Public, no-auth inquiry/appointment status tracker for customers — the Inquiry-side counterpart to /service-centre-track/[partnerId]/[code]. Read-only.",
  sourceFile: "src/app/service-centre-track-inquiry/[partnerId]/[code]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function TrackInquiryPage({
  params,
}: {
  params: { partnerId: string; code: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "service-centre-inquiry", params.code);
  if (!record) notFound();
  const partner = await getPartner(params.partnerId);
  const status = String(record["status"] ?? "Open");

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-bg-sunken px-4 py-10">
      <div className="rounded-lg border border-border bg-bg-raised p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{partner?.businessName ?? "Service Centre"}</p>
        <h1 className="mt-1 font-display text-xl font-bold text-text">Inquiry {String(record["id"])}</h1>
        <p className="mt-1 text-sm text-text-muted">
          {serviceTypeLabel(String(record["serviceType"] ?? ""))} &middot; {String(record["complaint"] ?? "")}
        </p>

        <div className="mt-6 rounded-md bg-bg-sunken p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Current Status</p>
          <p className="mt-1 font-display text-lg font-bold text-text">
            {status === "Open" && "Received — Awaiting Contact"}
            {status === "Converted" && "Accepted — Repair In Progress"}
            {status === "Closed" && "Closed"}
          </p>
        </div>

        {status === "Converted" && Boolean(record["convertedToWorkorderId"]) && (
          <div className="mt-4 text-center">
            <p className="text-sm text-text-muted">
              This has become workorder{" "}
              <span className="font-semibold text-text">{String(record["convertedToWorkorderId"])}</span> — track its
              repair progress directly:
            </p>
            <Link
              href={`/service-centre-track/${encodeURIComponent(params.partnerId)}/${encodeURIComponent(String(record["convertedToWorkorderId"]))}`}
              className="btn-accent mt-3 inline-block"
            >
              Track My Repair &rarr;
            </Link>
          </div>
        )}

        {status === "Closed" && (
          <div className="mt-4 text-center text-sm text-text-muted">
            Reason: {String(record["closeReason"] ?? "Not specified")}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-text-muted">
          For questions about this request, please contact the service centre directly.
        </p>
      </div>
    </div>
  );
}
