import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import Link from "next/link";
import { registerPage } from "@/lib/designer/registry";
import { prisma } from "@/lib/prisma";
import { signupPosStaffAction } from "../actions";

registerPage({
  id: "pos.staff.signup",
  moduleSlug: "pos",
  title: "POS — Staff Signup",
  path: "/partner/[partnerId]/pos/staff/signup",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Owner/Admin-only POS staff provisioning. The first provisioned staff member is a Manager; subsequent roles are selected by the authorized owner or administrator.",
  sourceFile: "src/app/partner/[partnerId]/pos/staff/signup/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function PosStaffSignupPage({ params }: { params: { partnerId: string } }) {
  await requireSessionPartnerId(params.partnerId);
  const action = signupPosStaffAction.bind(null, params.partnerId);
  const account = await prisma.posAccount.findUnique({ where: { partnerId: params.partnerId } });

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="font-display text-xl font-bold text-text">
        {account ? `Join ${account.accountNumber}` : "Set Up POS"}
      </h1>
      <p className="mt-1 text-sm text-text-muted">
        {account
          ? `You'll be assigned the next staff code under ${account.accountNumber} (e.g. ${account.accountNumber}-02).`
          : "You're the first sign-up for this business — this creates its POS account and makes you a Manager."}
      </p>

      <form action={action} className="mt-4 space-y-3">
        {!account && (
          <input
            name="outletName"
            placeholder="Outlet Name (e.g. Koramangala Store)"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          />
        )}
        <input name="name" placeholder="Your Name" required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
        <input name="phone" placeholder="Phone (optional)" className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
        <input
          name="password"
          type="password"
          placeholder="Password (min 6 characters)"
          required
          minLength={6}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
        {account && (
          <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Role
            <select name="role" defaultValue="Cashier" className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
              <option value="Cashier">Cashier</option>
              <option value="Manager">Manager</option>
            </select>
          </label>
        )}
        <button type="submit" className="btn-accent w-full">
          {account ? "Create Staff Login" : "Set Up POS & Create My Login"}
        </button>
      </form>

      <p className="mt-4 text-sm text-text-muted">
        Already have a staff code?{" "}
        <Link href={`/partner/${params.partnerId}/pos/staff/login`} className="text-accent hover:underline">
          Sign in instead
        </Link>
      </p>
    </div>
  );
}
