import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/PublicHeader";
import { registerPage } from "@/lib/designer/registry";
import { getPartnerType } from "@/lib/designer/partnerTypesData";
import { SignupForm } from "../SignupForm";

export const dynamic = "force-dynamic";

// Same defense-in-depth as the old shared /signup page — see that page's
// comment for why this stays noindex even though it's linked internally.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

registerPage({
  id: "platform.signup.type",
  moduleSlug: "platform",
  title: "Signup (per business type)",
  path: "/signup/[type]",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Real, per-business-type 'Register your business' page — one live URL per Active PartnerType (e.g. /signup/clinic), replacing the old single shared /signup?type= form. Renders the same base fields every business type collects (Business Name, Address, Pincode-driven City/State, GSTIN, Business Email, Business Contact, product domain multi-select, Login Contact, Referral code) plus that PartnerType's own Super-Admin-configured customSignupFields. 404s for an unknown or non-Active type. The old /signup path is now a business-type picker/redirect into this route.",
  sourceFile: "src/app/signup/[type]/page.tsx",
});

export default async function SignupTypePage({
  params,
  searchParams,
}: {
  params: { type: string };
  searchParams: { error?: string; ref?: string };
}) {
  const partnerType = await getPartnerType(params.type);
  if (!partnerType || partnerType.status !== "Active") notFound();

  return (
    <div className="min-h-screen w-full bg-bg">
      <PublicHeader showCta={false} signInLabel="Already have an account? Sign in" />

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <h1 className="font-display text-3xl font-bold text-text">Register your {partnerType.id} business</h1>
          <p className="mt-2 max-w-xl text-sm text-text-muted">
            You&apos;ll be assigned a Partner ID (e.g. {partnerType.idPrefix}0001) and a one-time password once
            you submit — no password to make up here.
          </p>

          <SignupForm partnerType={partnerType} error={searchParams.error} referralCode={searchParams.ref} />
        </div>

        <aside className="h-fit rounded-lg border border-border bg-bg-raised p-6">
          <h2 className="font-display text-base font-bold text-text">What happens next</h2>
          <ol className="mt-4 space-y-3 text-sm text-text-muted">
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                1
              </span>
              We assign your Partner ID and a one-time password.
            </li>
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                2
              </span>
              Sign in with your Partner ID (or contact number) and that password.
            </li>
            <li className="flex gap-2.5">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                3
              </span>
              You&apos;ll be asked to set your own password before doing anything else.
            </li>
          </ol>
          {partnerType.description && (
            <div className="mt-6 border-t border-border pt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{partnerType.id}</div>
              <p className="mt-1 text-sm text-text-muted">{partnerType.description}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
