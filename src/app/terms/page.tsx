import { PublicHeader } from "@/components/PublicHeader";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "platform.terms",
  moduleSlug: "platform",
  title: "Terms of Service",
  path: "/terms",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Public Terms of Service page. Placeholder legal copy — a real product needs this reviewed by counsel before launch; the structure/sections are real, the specific clauses are not legal advice.",
  sourceFile: "src/app/terms/page.tsx",
});

export default function TermsPage() {
  return (
    <div className="mbf-page min-h-screen w-full bg-bg">
      <PublicHeader />
      <div className="mx-auto max-w-[65ch] px-6 py-16">
        <h1 className="font-display text-3xl font-bold text-text">Terms of Service</h1>
        <p className="mt-2 text-sm text-text-muted">Last updated: placeholder — not legal advice.</p>

        <div className="mbf-prose mt-8 flex flex-col gap-6 text-sm text-text">
          <Section title="1. Using My Biz Flow">
            By registering a business (a &quot;Vendor&quot; account) and using any module, you
            agree to these terms. Access to Super Admin functionality is restricted and governed
            separately by your organization&apos;s internal policy.
          </Section>
          <Section title="2. Your data">
            Records you create belong to your Vendor account. We do not sell your business data.
            See the Privacy Policy for what we collect and why.
          </Section>
          <Section title="3. Plans and billing">
            Features available to your account are determined by your subscription plan (Basic,
            Pro, or Ultimate) and any modules a Super Admin has additionally enabled. Payment
            terms are shown at checkout.
          </Section>
          <Section title="4. Acceptable use">
            You may not use the platform to store unlawful content, attempt to access another
            Vendor&apos;s data, or circumvent module/seat limits on your plan.
          </Section>
          <Section title="5. Changes">
            We may update these terms; continued use after a change constitutes acceptance.
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-lg font-bold text-text">{title}</h2>
      <p className="mt-1.5 text-text-muted">{children}</p>
    </div>
  );
}
