import { AppShell } from "@/components/AppShell";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { UserClientTable } from "./UserClientTable";

registerPage({
  id: "users.list",
  moduleSlug: "platform",
  title: "Users — List",
  path: "/vendor/[vendorId]/admin/users",
  kind: "list",
  superAdminOnly: true,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation:
    "A vendor's own team members (e.g. \"Meena R., Cashier\") — distinct from central-api's PlatformUser (the cross-tenant platform login identity). Each User has exactly one Role, which is a bundle of Access Groups. No central-api integration is built here — out of scope for this pass.",
  sourceFile: "src/app/vendor/[vendorId]/admin/users/page.tsx",
});

export default async function UsersPage({ params }: { params: { vendorId: string } }) {
  return (
    <AppShell
      vendorId={params.vendorId}
      navGroups={await buildVendorAdminNavGroups("users")}
      topbarTitle="Users"
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/admin/users/new`} className="btn-accent">
          + New User
        </Link>
      }
    >
      <SuperAdminGate>
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Users</h1>
          <p className="mt-1 text-sm text-text-muted">
            This vendor account&apos;s team members. Each User has one Role.
            There is no vendor-level Owner/Admin permission-check system yet
            either — everything under this section is gated the same
            shared-secret way as every other admin route (see the banner
            below), not real per-user auth.
          </p>
          <div className="mt-6">
            <UserClientTable vendorId={params.vendorId} />
          </div>
        </div>
      </SuperAdminGate>
    </AppShell>
  );
}
