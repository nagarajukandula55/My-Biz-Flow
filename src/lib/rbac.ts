import { getRole } from "@/lib/designer/rolesData";
import { getAccessGroup } from "@/lib/designer/accessGroupsData";
import { getRegisteredPages } from "@/lib/designer/registry";
import "@/lib/designer/registerAll";

/**
 * Real RBAC resolution logic (Role -> Access Groups -> pages -> module
 * slugs), fed by a DEMO role selection — there is no logged-in-user
 * session yet (see src/lib/adminAuth.ts for the one real-but-minimal auth
 * mechanism that exists, which only covers Super Admin, not vendor-level
 * roles). The function below is correct and real, backed by the Prisma
 * Role/AccessGroup tables; only its INPUT (getDemoViewerRole) is a
 * stopgap. Once vendor-user sessions exist, swap that for a real session
 * lookup and everything downstream keeps working unchanged.
 */

export async function getAccessibleModuleSlugs(roleId: string): Promise<string[]> {
  const role = await getRole(roleId);
  if (!role) return [];

  const pageModuleBySlug = new Map(getRegisteredPages().map((p) => [p.id, p.moduleSlug]));
  const slugs = new Set<string>();
  for (const groupId of role.accessGroupIds) {
    const group = await getAccessGroup(groupId);
    if (!group) continue;
    for (const perm of group.pagePermissions) {
      if (!(perm.view || perm.edit || perm.delete || perm.other)) continue;
      const moduleSlug = pageModuleBySlug.get(perm.pageId);
      if (moduleSlug) slugs.add(moduleSlug);
    }
  }
  return Array.from(slugs);
}

/** Demo stand-in for "the currently signed-in vendor user's role." */
export function getDemoViewerRole(): string {
  return "Owner / Admin";
}

/**
 * Filters any array of module-scoped items down to what the viewer's role
 * can actually see. Generic over anything carrying a moduleSlug — used by
 * the Analytics page's chart list and reusable anywhere else that needs
 * the same access check.
 */
export function filterByAccessibleModules<T extends { moduleSlug: string }>(
  items: T[],
  accessibleModuleSlugs: string[]
): T[] {
  const allowed = new Set(accessibleModuleSlugs);
  return items.filter((item) => allowed.has(item.moduleSlug));
}
