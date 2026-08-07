import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { registerPage } from "@/lib/designer/registry";
import { MODULES, type ModuleTaxonomy } from "@/lib/designer/modules";
import { registerBusiness } from "./actions";

registerPage({
  id: "platform.signup",
  moduleSlug: "platform",
  title: "Signup",
  path: "/signup",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Public 'Register your business' flow — business name, email, password, and a module-type picker (checkboxes over MODULES, grouped by taxonomy) since signup is where a Vendor's module types get selected. Demo Server Action only — logs the submission and redirects to /login, no real Vendor record is created (no DB yet).",
  sourceFile: "src/app/signup/page.tsx",
});

const TAXONOMY_LABEL: Record<ModuleTaxonomy, string> = {
  brand: "Brand",
  vertical: "Verticals",
  "cross-cutting": "Cross-cutting",
};

function groupedModules() {
  const groups: Record<ModuleTaxonomy, typeof MODULES> = { brand: [], vertical: [], "cross-cutting": [] };
  for (const m of MODULES) groups[m.taxonomy].push(m);
  return groups;
}

export default function SignupPage({ searchParams }: { searchParams: { plan?: string } }) {
  const groups = groupedModules();

  return (
    <div className="mbf-page flex min-h-screen w-full justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-2xl">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <LogoMark size={24} />
          <span className="font-display text-lg font-extrabold text-text">My Biz Flow</span>
        </Link>
        <h1 className="font-display text-2xl font-bold text-text">Register your business</h1>
        <p className="mt-1 text-sm text-text-muted">
          Demo signup — no real backend yet. Submitting logs the values and redirects to /login; no Vendor record is
          actually created.
          {searchParams.plan && (
            <>
              {" "}
              Selected plan: <span className="font-semibold text-text">{searchParams.plan}</span>.
            </>
          )}
        </p>

        <form action={registerBusiness} className="mt-8 space-y-6">
          {searchParams.plan && <input type="hidden" name="plan" value={searchParams.plan} />}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Business Name
              <input
                type="text"
                name="businessName"
                required
                className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Email
              <input
                type="email"
                name="email"
                required
                className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted sm:col-span-2">
              Password
              <input
                type="password"
                name="password"
                required
                className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
              />
            </label>
          </div>

          <div>
            <h2 className="font-display text-base font-bold text-text">Which modules do you need?</h2>
            <p className="mt-1 text-sm text-text-muted">
              Your business&apos;s &quot;type&quot; is just the modules you enable — pick as many as apply.
            </p>
            <div className="mt-4 space-y-5">
              {(Object.keys(groups) as ModuleTaxonomy[]).map((tax) => (
                <div key={tax}>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    {TAXONOMY_LABEL[tax]}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {groups[tax].map((m) => (
                      <label key={m.slug} className="flex items-center gap-2 text-sm text-text">
                        <input
                          type="checkbox"
                          name="modules"
                          value={m.slug}
                          className="h-4 w-4 rounded border-border accent-current text-teal"
                        />
                        {m.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-accent w-full sm:w-auto">
            Create account
          </button>
        </form>

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
