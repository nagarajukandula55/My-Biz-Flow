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
    "Public 'Register your business' flow, full-page layout (not a centered card). Vendor Type is the only thing the vendor picks/sees (modules, Roles, and plan tiers stay Super-Admin-configured, never shown here) — everything else is business details needed for invoicing plus a login contact number. No password field: one is generated and shown once on /signup/success (or held for approval on /signup/pending if the type requires it), forcing a change on first login.",
  sourceFile: "src/app/signup/page.tsx",
});

export default async function SignupPage({
  searchParams,
}: {
  searchParams: { type?: string; error?: string };
}) {
  const vendorTypes = await listActiveVendorTypes();
  const selected = vendorTypes.find((t) => t.id === searchParams.type) ?? vendorTypes[0];

  return (
    <div className="min-h-screen w-full bg-bg">
      <header className="flex items-center justify-between border-b border-border px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark size={22} />
          <span className="font-display text-base font-extrabold text-text">My Biz Flow</span>
        </Link>
        <Link href="/login" className="text-sm font-semibold text-text-muted hover:text-text">
          Already have an account? Sign in
        </Link>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <h1 className="font-display text-3xl font-bold text-text">Register your business</h1>
          <p className="mt-2 max-w-xl text-sm text-text-muted">
            You&apos;ll be assigned a Vendor ID (e.g. VND0001) and a one-time password once you submit — no
            password to make up here.
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
            <form action={registerBusiness} className="mt-8 space-y-8">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Business Type
                  <select
                    name="vendorTypeId"
                    required
                    defaultValue={selected?.id ?? ""}
                    className="mt-1 w-full max-w-sm rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
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
                      Without a GSTIN you can still invoice customers, but B2B GST invoices won&apos;t be
                      available — only B2C.
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
                  This number is what you&apos;ll sign in with, alongside your Vendor ID. OTP verification is
                  coming soon — for now, a generated password.
                </p>
                <div className="mt-4 max-w-sm">
                  <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Registered Contact Number
                    <input
                      type="tel"
                      name="loginContact"
                      required
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
        </div>

        <aside className="h-fit rounded-lg border border-border bg-bg-raised p-6">
          <h2 className="font-display text-base font-bold text-text">What happens next</h2>
          <ol className="mt-4 space-y-3 text-sm text-text-muted">
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                1
              </span>
              We assign your Vendor ID and a one-time password.
            </li>
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                2
              </span>
              Sign in with your Vendor ID (or contact number) and that password.
            </li>
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                3
              </span>
              You&apos;ll be asked to set your own password before doing anything else.
            </li>
          </ol>
          {selected?.description && (
            <div className="mt-6 border-t border-border pt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{selected.id}</div>
              <p className="mt-1 text-sm text-text-muted">{selected.description}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
