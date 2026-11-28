import { MODULES } from "@/lib/designer/modules";
import { getVisibleModuleSlugs } from "@/lib/designer/entitlements";
import { ModuleAccessError } from "@/lib/tenant";

/** Generic record partitions use the module slug, optionally followed by a
 * hyphenated subcollection (for example inventory-bom). Match the longest
 * module name first so accounting-gst never resolves to accounting. */
export function moduleForRecordPartition(partition: string): string | null {
  return MODULES.map(({ slug }) => slug)
    .sort((left, right) => right.length - left.length)
    .find((slug) => partition === slug || partition.startsWith(`${slug}-`)) ?? null;
}

export async function assertRecordModuleAccess(partnerId: string, partition: string): Promise<void> {
  const moduleSlug = moduleForRecordPartition(partition);
  if (!moduleSlug) return; // Platform-owned partitions have no module entitlement.
  if (!(await getVisibleModuleSlugs(partnerId)).includes(moduleSlug)) {
    throw new ModuleAccessError(`Module access denied for ${moduleSlug}.`);
  }
}
