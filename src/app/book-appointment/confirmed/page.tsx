import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "platform.book-appointment.confirmed",
  moduleSlug: "platform",
  title: "Book Appointment — Confirmed",
  path: "/book-appointment/confirmed",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Public confirmation screen shown after bookAppointmentAction successfully assigns an inquiry to a partner.",
  sourceFile: "src/app/book-appointment/confirmed/page.tsx",
});

export default function BookAppointmentConfirmedPage({
  searchParams,
}: {
  searchParams: { ref?: string; business?: string };
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg-raised p-8 text-center">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <BrandLogo height={32} />
        </Link>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-2xl text-success">
          ✓
        </div>
        <h1 className="mt-4 font-display text-xl font-bold text-text">Appointment Requested</h1>
        <p className="mt-2 text-sm text-text-muted">
          {searchParams.business ? (
            <>
              We've sent your request to <span className="font-semibold text-text">{searchParams.business}</span>.
              They'll reach out to confirm.
            </>
          ) : (
            "We've sent your request to a service centre near you. They'll reach out to confirm."
          )}
        </p>
        {searchParams.ref && (
          <p className="mt-3 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
            Reference: <span className="font-semibold tabular-nums">{searchParams.ref}</span>
          </p>
        )}
        <Link href="/" className="btn-outline mt-6 inline-block w-full">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
