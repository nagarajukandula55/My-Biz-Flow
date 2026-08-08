import { accessGroupRows } from "@/lib/sample-data/access-groups";
import { roleRows } from "@/lib/sample-data/roles";

/**
 * Real RBAC resolution logic (Role -> Access Groups -> module slugs), but
 * fed by a DEMO role selection — there is no logged-in-user session yet
 * (see src/lib/adminAuth.ts for the one real-but-minimal auth mechanism
 * that exists, which only covers Super Admin, not vendor-level roles).
 * The function below is correct and real; only its INPUT is a stopgap.
 * Once vendor-user sessions exist, swap getDemoViewerRole() for a real
 * session lookup and everything downstream keeps working unchanged.
 */

export function getAccessibleModuleSlugs(roleId: string): string[] {
  const role = roleRows.find((r) => r["id"] === roleId);
  if (!role) return [];
  const groupNames = (role["accessGroups"] as string[]) ?? [];
  const slugs = new Set<string>();
  for (const groupName of groupNames) {
    const group = accessGroupRows.find((g) => g["id"] === groupName);
    for (const slug of (group?.["modules"] as string[]) ?? []) {
      slugs.add(slug);
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
