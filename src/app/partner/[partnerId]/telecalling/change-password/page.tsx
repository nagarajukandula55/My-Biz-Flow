import { redirect } from "next/navigation";
import { registerPage } from "@/lib/designer/registry";
import { getStaffSession } from "@/lib/requirePartnerSession";
import { staffChangePasswordAction } from "@/lib/telecalling/agentAuth";

registerPage({
  id: "telecalling.staff-change-password",
  moduleSlug: "telecalling",
  title: "Telecalling — Agent Change Password",
  path: "/partner/[partnerId]/telecalling/change-password",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Forced first-login password change for a Telecaller agent whose account was just created (PartnerStaff.mustChangePassword) — mirrors the owner-level /change-password flow.",
  sourceFile: "src/app/partner/[partnerId]/telecalling/change-password/page.tsx",
});

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  too_short: "Password must be at least 8 characters.",
  mismatch: "Passwords do not match.",
};

export default async function StaffChangePasswordPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: { error?: string };
}) {
  const session = await getStaffSession();
  if (!session || session.partnerId !== params.partnerId) {
    redirect(`/partner/${params.partnerId}/telecalling/login`);
  }

  const action = staffChangePasswordAction.bind(null, params.partnerId);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg-raised p-6">
        <h1 className="font-display text-lg font-bold text-text">Set a new password</h1>
        <p className="mt-1 text-sm text-text-muted">This is your first login — choose a password only you know.</p>

        {searchParams.error && (
          <p className="mt-3 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            {ERROR_MESSAGES[searchParams.error] ?? "Something went wrong."}
          </p>
        )}

        <form action={action} className="mt-4 space-y-3">
          <input
            name="newPassword"
            type="password"
            required
            minLength={8}
            placeholder="New password (min 8 characters)"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          />
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            placeholder="Confirm new password"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          />
          <button type="submit" className="btn-accent w-full">
            Save & Continue
          </button>
        </form>
      </div>
    </div>
  );
}
