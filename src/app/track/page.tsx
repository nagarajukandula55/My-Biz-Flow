import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { registerPage } from "@/lib/designer/registry";
import { lookupWorkorder } from "./actions";

export const metadata: Metadata = {
  title: "Track My Repair — Find Your Service Status",
  description:
    "Lost your repair tracking link? Look it up again with your workorder number and the phone number used at intake — no account or login needed.",
  alternates: { canonical: "/track" },
};

registerPage({
  id: "platform.track",
  moduleSlug: "platform",
  title: "Track My Repair",
  path: "/track",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Public, no-login workorder lookup — a customer who has lost their tracking link finds it again by entering the workorder number AND the phone number used at intake (both required). Server Action (src/app/track/actions.ts) is the one place in this app a public query intentionally spans every partner's data, gated by requiring both fields to match together; a match redirects to the existing /service-centre-track/[partnerId]/[code] page rather than rendering its own status view. A non-match never reveals which field was wrong.",
  sourceFile: "src/app/track/page.tsx",
});

export default function TrackPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg-raised p-8">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <BrandLogo height={32} />
        </Link>
        <h1 className="font-display text-xl font-bold text-text">Track My Repair or Appointment</h1>
        <p className="mt-1 text-sm text-text-muted">
          Enter your reference number (workorder or appointment/inquiry number) and the phone number you gave, to
          check its status.
        </p>

        {(searchParams.error === "not_found" || searchParams.error === "missing") && (
          <p className="mt-3 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            No matching workorder found — check the number and phone, or use the link from your receipt/SMS.
          </p>
        )}

        <form action={lookupWorkorder} className="mt-6 flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Reference Number
            <input
              type="text"
              name="workorderNumber"
              placeholder="e.g. WO2609150001 or INQ-0001"
              required
              autoFocus
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Phone Number used at intake
            <input
              type="tel"
              name="phone"
              placeholder="98xxxxxxxx"
              required
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            />
          </label>
          <button type="submit" className="btn-accent mt-2 w-full">
            Track my repair
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          <Link href="/login" className="font-semibold text-teal hover:underline">
            &larr; Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
