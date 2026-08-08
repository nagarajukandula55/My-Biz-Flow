import { PublicHeader } from "@/components/PublicHeader";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "platform.privacy",
  moduleSlug: "platform",
  title: "Privacy Policy",
  path: "/privacy",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Public Privacy Policy page. Placeholder copy reflecting what this codebase actually does today (no real analytics/tracking wired up, error logs capture stack traces, IP addresses are captured on specific audit-relevant actions per DESIGN_SYSTEM.md) — needs legal review before launch, not a substitute for it.",
  sourceFile: "src/app/privacy/page.tsx",
});

export default function PrivacyPage() {
  return (
    <div className="mbf-page min-h-screen w-full bg-bg">
      <PublicHeader />
      <div className="mx-auto max-w-[65ch] px-6 py-16">
        <h1 className="font-display text-3xl font-bold text-text">Privacy Policy</h1>
        <p className="mt-2 text-sm text-text-muted">Last updated: placeholder — not legal advice.</p>

        <div className="mbf-prose mt-8 flex flex-col gap-6 text-sm text-text">
          <Section title="What we collect">
            Business/account information you provide at signup, records you create in any
            module, and — for specific audit-relevant actions only (e.g. staff check-ins,
            payment/financial actions) — IP address and location coordinates, never collected
            indiscriminately across every action.
          </Section>
          <Section title="Error reporting">
            When something goes wrong, we record the error message, a stack trace, and which
            page it happened on, so it can be fixed. This is visible only to Super Admins.
          </Section>
          <Section title="Who can see your data">
            Your Vendor account&apos;s data is scoped to your account. Platform Super Admins can
            access account configuration and support-relevant data as needed to operate the
            service.
          </Section>
          <Section title="Third parties">
            We do not sell your data. Payment processing (when enabled) is handled by a
            third-party gateway per its own privacy terms.
          </Section>
          <Section title="Contact">
            Questions about this policy — see the Contact page.
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
