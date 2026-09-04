import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { listPartners } from "@/lib/partnerData";
import { MODULES } from "@/lib/designer/modules";
import { listAllAccessKeys } from "@/lib/designer/accessKeys";
import { issueAccessKeyAction, revokeAccessKeyAction } from "./actions";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.access-keys.list",
  moduleSlug: "platform",
  title: "Access Keys",
  path: "/admin/access-keys",
  kind: "admin",
  superAdminOnly: true,
  customizableRegions: [],
  explanation:
    "The main key for an entire module, per partner. A module being in a Partner Type's default module set only toggles it on for the plan — this is the actual per-partner secret that gates whether that module's data is reachable (assertModuleAccess in src/lib/tenant.ts). Issue one here to turn a module on for a specific partner, revoke to turn it off — independent of plan/type changes.",
  sourceFile: "src/app/admin/(protected)/access-keys/page.tsx",
});

export default async function AccessKeysPage() {
  const [partners, keys] = await Promise.all([listPartners(), listAllAccessKeys()]);
  const keyByPair = new Map(keys.map((k) => [`${k.partnerId}:${k.moduleSlug}`, k]));

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Access Keys</h1>
          <p className="mt-1 max-w-[70ch] text-sm text-text-muted">
            One row per partner × module. Issue a key to grant that module, revoke to withdraw it —
            independent of what the partner&apos;s Partner Type nominally includes.
          </p>
        </div>

        <div className="overflow-x-auto p-6">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="py-2 pr-4 font-medium">Partner</th>
                <th className="py-2 pr-4 font-medium">Module</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Key</th>
                <th className="py-2 pr-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {partners.flatMap((partner) =>
                MODULES.map((mod) => {
                  const record = keyByPair.get(`${partner.id}:${mod.slug}`);
                  const active = record?.status === "active";
                  return (
                    <tr key={`${partner.id}:${mod.slug}`} className="border-b border-border/60">
                      <td className="py-2 pr-4 text-text">
                        {partner.businessName} <span className="text-text-muted">({partner.id})</span>
                      </td>
                      <td className="py-2 pr-4 text-text">{mod.label}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={
                            active
                              ? "rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success"
                              : "rounded-full bg-bg px-2 py-0.5 text-xs font-semibold text-text-muted"
                          }
                        >
                          {active ? "Active" : record ? "Revoked" : "None"}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-text-muted">{record?.key ?? "—"}</td>
                      <td className="py-2 pr-4">
                        {active ? (
                          <form action={revokeAccessKeyAction}>
                            <input type="hidden" name="partnerId" value={partner.id} />
                            <input type="hidden" name="moduleSlug" value={mod.slug} />
                            <button type="submit" className="btn-ghost text-xs">
                              Revoke
                            </button>
                          </form>
                        ) : (
                          <form action={issueAccessKeyAction}>
                            <input type="hidden" name="partnerId" value={partner.id} />
                            <input type="hidden" name="moduleSlug" value={mod.slug} />
                            <button type="submit" className="btn-accent text-xs">
                              Issue
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SuperAdminGate>
  );
}
