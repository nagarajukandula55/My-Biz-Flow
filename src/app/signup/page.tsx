import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PublicHeader } from "@/components/PublicHeader";
import { registerPage } from "@/lib/designer/registry";
import { listActivePartnerTypes } from "@/lib/designer/partnerTypesData";

export const dynamic = "force-dynamic";

// Defense-in-depth alongside robots.ts's existing Disallow — see the old
// version of this page's comment (preserved here) for why this stays
// noindex regardless.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

registerPage({
  id: "platform.signup",
  moduleSlug: "platform",
  title: "Signup",
  path: "/signup",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Business-type picker, no longer the signup form itself (each Active PartnerType now has its own real /signup/<type> page — see platform.signup.type). Old bookmarks/links of the form /signup?type=<slug> still work: this page redirects straight into /signup/<slug> when that query param names a known, Active type, preserving ?ref= and ?error=. With no ?type= (or an unknown one), it shows a plain list of every Active business type linking into its own page.",
  sourceFile: "src/app/signup/page.tsx",
});

export default async function SignupPickerPage({
  searchParams,
}: {
  searchParams: { type?: string; error?: string; ref?: string };
}) {
  const partnerTypes = await listActivePartnerTypes();

  // Preserve old /signup?type=<slug>[&ref=...][&error=...] links/bookmarks
  // by forwarding straight into that type's own page, rather than 404ing
  // them or silently dropping the type they asked for.
  if (searchParams.type && partnerTypes.some((t) => t.id === searchParams.type)) {
    const qs = new URLSearchParams();
    if (searchParams.ref) qs.set("ref", searchParams.ref);
    if (searchParams.error) qs.set("error", searchParams.error);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    redirect(`/signup/${encodeURIComponent(searchParams.type)}${suffix}`);
  }

  return (
    <div className="min-h-screen w-full bg-bg">
      <PublicHeader showCta={false} signInLabel="Already have an account? Sign in" />

      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-3xl font-bold text-text">Register your business</h1>
        <p className="mt-2 max-w-xl text-sm text-text-muted">Choose the type of business you run to continue.</p>

        {partnerTypes.length === 0 ? (
          <p className="mt-8 rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
            No business types are open for signup yet — check back soon.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {partnerTypes.map((t) => (
              <Link
                key={t.id}
                href={`/signup/${encodeURIComponent(t.id)}${searchParams.ref ? `?ref=${encodeURIComponent(searchParams.ref)}` : ""}`}
                className="rounded-md border border-border bg-bg-raised p-4 text-sm font-semibold text-text hover:border-teal"
              >
                {t.id}
                {t.description && <span className="mt-1 block text-xs font-normal text-text-muted">{t.description}</span>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
