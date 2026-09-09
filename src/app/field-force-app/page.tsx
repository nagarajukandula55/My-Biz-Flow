import Link from "next/link";
import { env } from "@/lib/env";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "field-force.standalone-entry",
  moduleSlug: "field-force",
  title: "Field Force — Standalone App Entry",
  path: "/field-force-app",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Entry point for a standalone Field Force deployment (FIELD_FORCE_STANDALONE=true) — reads FIELD_FORCE_PARTNER_ID and offers Customer/Provider login. On the normal deployment this page is reachable but unused (nothing links to it); on a standalone deployment, src/middleware.ts redirects every other route here.",
  sourceFile: "src/app/field-force-app/page.tsx",
});

/**
 * The entry point for a standalone Field Force deployment (FIELD_FORCE_STANDALONE=true)
 * — a separate Vercel project/domain, same repo+DB, that serves only one
 * partner's Customer/Provider self-serve app. See src/middleware.ts for the
 * route lock-down and FIELD_FORCE_PARTNER_ID's role here.
 */
export default function FieldForceAppEntryPage() {
  const partnerId = env.fieldForcePartnerId();

  if (!partnerId) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <h1 className="font-display text-xl font-bold text-text">Field Force</h1>
        <p className="mt-2 text-sm text-text-muted">
          This deployment isn&apos;t configured yet — set <code>FIELD_FORCE_PARTNER_ID</code> to the
          partner this app should serve.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="font-display text-2xl font-bold text-text">Field Force</h1>
      <p className="text-sm text-text-muted">Book a service, or manage jobs as a provider.</p>
      <div className="flex w-full flex-col gap-3">
        <Link href={`/partner/${partnerId}/field-force/customer/login`} className="btn-accent">
          I need a service
        </Link>
        <Link href={`/partner/${partnerId}/field-force/provider/login`} className="btn-outline">
          I provide services
        </Link>
      </div>
    </div>
  );
}
