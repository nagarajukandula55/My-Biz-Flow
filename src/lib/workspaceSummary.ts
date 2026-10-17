import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { safeCache } from "@/lib/safeCache";
import { getVisibleModuleSlugs } from "@/lib/designer/entitlements";
import { getWorkspaceProfiles, type WorkspaceProfile } from "@/lib/workspaceProfiles";

export type WorkspaceSummary = WorkspaceProfile & { metrics: { label: string; value: number }[] };

/** One aggregate round trip, no business-record payloads, only authorized module tables.
 * All identifiers originate in the source-controlled profiles. Tenant IDs and JSON keys
 * are parameters. There is no cross-request cache that could leak one tenant's data.
 */
export async function loadWorkspaceSummary(partnerId: string, enabledSlugs: readonly string[]): Promise<WorkspaceSummary[]> {
  const profiles = getWorkspaceProfiles(enabledSlugs).filter(p => p.sources.length);
  const queries = profiles.flatMap(profile => profile.sources.map((source, index) => {
    const state = source.state;
    const expression = state ? (state.json ? Prisma.sql`data ->> ${state.column}` : Prisma.raw(`"${state.column}"`)) : null;
    const matching = state && expression ? Prisma.sql`count(*) FILTER (WHERE ${expression} IN (${Prisma.join(state.values)}))` : Prisma.sql`0::bigint`;
    return Prisma.sql`SELECT ${profile.slug}::text AS module, ${index}::integer AS source,
      count(*) AS total, ${matching} AS matching
      FROM ${Prisma.raw(`"${source.table}"`)} WHERE "partnerId" = ${partnerId}
      ${source.recordModule ? Prisma.sql`AND "moduleSlug" = ${source.recordModule}` : Prisma.empty}`;
  }));
  if (!queries.length) return [];
  const rows = await prisma.$queryRaw<{ module: string; source: number; total: bigint; matching: bigint }[]>(Prisma.join(queries, " UNION ALL "));
  return profiles.map(profile => ({ ...profile, metrics: profile.sources.flatMap((source, index) => {
    const row = rows.find(r => r.module === profile.slug && r.source === index);
    if (!row) throw new Error("Incomplete workspace summary");
    return [{ label: source.label, value: Number(row.total) }, ...(source.state ? [{ label: source.state.label, value: Number(row.matching) }] : [])];
  }) }));
}

export const getWorkspaceSummary = safeCache(async (partnerId: string): Promise<WorkspaceSummary[]> =>
  loadWorkspaceSummary(partnerId, await getVisibleModuleSlugs(partnerId)));
