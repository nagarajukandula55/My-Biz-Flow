import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { registerPage } from "@/lib/designer/registry";
import { listActiveVendorTypes } from "@/lib/designer/vendorTypesData";
import { PincodeLookupFields } from "./PincodeLookupFields";
import { registerBusiness } from "./actions";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.signup",
  moduleSlug: "platform",
  title: "Signup",
  path: "/signup",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Public 'Register your business' flow. Vendor Type is the only thing the vendor picks/sees (modules, Roles, and plan tiers stay Super-Admin-configured, never shown here) — everything else is business details needed for invoicing (Company Name, Address via pincode lookup, GSTIN optional, email, contact) plus a separate login contact number and password. Creates a real Vendor row (Prisma) with a sequential VND#### id and redirects to /login.",
  sourceFile: "src/app/signup/page.tsx",
});

export default async function SignupPage({
  searchParams,
}: {
  searchParams: { type?: string; error?: string };
}) {
  const vendorTypes = await listActiveVendorTypes();

  return (
    <div className="mbf-page flex min-h-screen w-full justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-2xl">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <LogoMark size={24} />
          <span className="font-display text-lg font-extrabold text-text">My Biz Flow</span>
        </Link>
        <h1 className="font-display text-2xl font-bold text-text">Register your business</h1>
        <p className="mt-1 text-sm text-text-muted">
          You&apos;ll be assigned a Vendor ID (e.g. VND0001) once you submit — that&apos;s what you&apos;ll use to
          sign in.
        </p>

        {searchParams.error === "contact_taken" && (
          <p className="mt-4 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            That contact number is already registered. Try signing in instead, or use a different number.
          </p>
        )}

        {vendorTypes.length === 0 ? (
          <p className="mt-8 rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
            No business types are open for signup yet — check back soon.
          </p>
        ) : (
          <form action={registerBusiness} className="mt-8 space-y-6">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Business Type
                <select
                  name="vendorTypeId"
                  required
                  defaultValue={searchParams.type ?? ""}
                  className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
                >
                  <option value="" disabled>
                    Select your business type
                  </option>
                  {vendorTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <h2 className="font-display text-base font-bold text-text">Business Details</h2>
              <p className="mt-1 text-xs text-text-muted">Used on your invoices.</p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-text-muted sm:col-span-2">
                  Company / Business Name
                  <input
                    type="text"
                    name="businessName"
                    required
                    className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-text-muted sm:col-span-2">
                  Address
                  <input
                    type="text"
                    name="addressLine"
                    className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
                  />
                </label>
                <div className="sm:col-span-2">
                  <PincodeLookupFields />
                </div>
                <label className="text-xs font-semibold uppercase tracking-wide text-text-muted sm:col-span-2">
                  GSTIN <span className="normal-case text-text-muted">(optional — skip if unregistered)</span>
                  <input
                    type="text"
                    name="gstin"
                    placeholder="22AAAAA0000A1Z5"
                    className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
                  />
                  <span className="mt-1 block text-xs font-normal normal-case text-text-muted">
                    Without a GSTIN you can still invoice customers, but B2B GST invoices won&apos;t be available —
                    only B2C.
                  </span>
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Business Email
                  <input
                    type="email"
                    name="businessEmail"
                    required
                    className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Business Contact Number
                  <input
                    type="tel"
                    name="businessContact"
                    required
                    className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
                  />
                </label>
              </div>
            </div>

            <div>
              <h2 className="font-display text-base font-bold text-text">Login</h2>
              <p className="mt-1 text-xs text-text-muted">
                Your registered contact number here is what you&apos;ll sign in with, alongside your Vendor ID.
                OTP verification for this number is coming soon — for now, a password.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Registered Contact Number
                  <input
                    type="tel"
                    name="loginContact"
                    required
                    className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Password
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={8}
                    className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
                  />
                </label>
              </div>
            </div>

            <button type="submit" className="btn-accent w-full sm:w-auto">
              Create account
            </button>
          </form>
        )}

        <p className="mt-6 text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-teal hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
