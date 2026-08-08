import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "platform.signup.pending",
  moduleSlug: "platform",
  title: "Signup — Pending Approval",
  path: "/signup/pending",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Landing page for a signup submitted against a Vendor Type with requiresApproval on — no Vendor ID exists yet. Super Admin reviews it at /admin/vendor-signups; approving assigns the id at that point.",
  sourceFile: "src/app/signup/pending/page.tsx",
});

export default function SignupPendingPage({ searchParams }: { searchParams: { businessName?: string } }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-lg rounded-lg border border-border bg-bg-raised p-8 text-center">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <LogoMark size={24} />
          <span className="font-display text-lg font-extrabold text-text">My Biz Flow</span>
        </Link>

        <h1 className="font-display text-2xl font-bold text-text">Application submitted</h1>
        <p className="mt-2 text-sm text-text-muted">
          {searchParams.businessName ? `${searchParams.businessName}'s` : "Your"} registration for this business
          type requires approval before a Vendor ID is assigned. We&apos;ll notify you once it&apos;s reviewed —
          email notifications are coming soon.
        </p>

        <Link href="/" className="btn-outline mt-6 inline-block w-full">
          Back to home
        </Link>
      </div>
    </div>
  );
}
