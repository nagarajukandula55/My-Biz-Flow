import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { registerPage } from "@/lib/designer/registry";
import { bookAppointmentAction } from "./actions";
import { SERVICE_TYPES } from "@/lib/serviceTypes";

export const metadata: Metadata = {
  title: "Book a Service Appointment",
  description:
    "Book a repair or service appointment online — no account needed. We match you to a service provider near you by pincode automatically.",
  alternates: { canonical: "/book-appointment" },
};

registerPage({
  id: "platform.book-appointment",
  moduleSlug: "platform",
  title: "Book Appointment",
  path: "/book-appointment",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Public, no-login inquiry/appointment booking. The customer never picks a partner — bookAppointmentAction (src/app/book-appointment/actions.ts) resolves one server-side by matching the chosen service type against each partner's configured Service Area (pincode, falling back to city, falling back to state; see src/lib/serviceCentreInquiryAssignment.ts), creates the Inquiry under that partner, and sends them a Telegram alert. A miss redirects back with an error rather than creating an unassigned record.",
  sourceFile: "src/app/book-appointment/page.tsx",
});

export default function BookAppointmentPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg px-6 py-10">
      <div className="w-full max-w-md rounded-lg border border-border bg-bg-raised p-8">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <BrandLogo height={32} />
        </Link>
        <h1 className="font-display text-xl font-bold text-text">Book an Appointment</h1>
        <p className="mt-1 text-sm text-text-muted">
          Tell us what's wrong and how you'd like it fixed — we'll route this to a service centre that covers
          your area.
        </p>

        {searchParams.error === "missing" && (
          <p className="mt-3 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            Please fill in all required fields with a valid 6-digit pincode.
          </p>
        )}
        {searchParams.error === "no_coverage" && (
          <p className="mt-3 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            No service centre currently covers your area for this service type yet — please call us directly, or
            try again later.
          </p>
        )}

        <form action={bookAppointmentAction} className="mt-6 flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Your Name
            <input
              type="text"
              name="customerName"
              required
              autoFocus
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-teal"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Phone Number
            <input
              type="tel"
              name="customerPhone"
              required
              placeholder="98xxxxxxxx"
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-teal"
            />
          </label>
          <fieldset className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Service Type
            <div className="mt-1 flex flex-col gap-2 normal-case">
              {SERVICE_TYPES.map((t, i) => (
                <label key={t.code} className="flex items-start gap-2 rounded-md border border-border p-2 text-sm text-text">
                  <input type="radio" name="serviceType" value={t.code} required defaultChecked={i === 0} className="mt-0.5" />
                  <span>
                    <span className="font-semibold">{t.label}</span>
                    <span className="block text-xs text-text-muted">{t.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            What's the issue?
            <textarea
              name="complaint"
              required
              rows={3}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-teal"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Brand (optional)
              <input
                type="text"
                name="brand"
                className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-teal"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Model (optional)
              <input
                type="text"
                name="model"
                className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-teal"
              />
            </label>
          </div>
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Address (optional)
            <input
              type="text"
              name="addressLine"
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-teal"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Pincode
            <input
              type="text"
              name="pincode"
              required
              pattern="\d{6}"
              maxLength={6}
              placeholder="6-digit pincode"
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-teal"
            />
          </label>
          <button type="submit" className="btn-accent mt-2 w-full">
            Book Appointment
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          <Link href="/track" className="font-semibold text-teal hover:underline">
            Already booked? Track your repair →
          </Link>
        </p>
      </div>
    </div>
  );
}
