import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getVisibleModuleSlugs } from "@/lib/designer/entitlements";

/** Next 14 templates receive children, but not route params. Middleware supplies
 * the current path on every request, including client navigations. */
export async function requireModuleTemplateAccess(moduleSlug: string): Promise<void> {
  const pathname = headers().get("x-pathname") ?? "";
  const match = /^\/partner\/([^/]+)\/([^/]+)(?:\/|$)/.exec(pathname);
  if (!match || match[2] !== moduleSlug) notFound();
  if (!(await getVisibleModuleSlugs(match[1])).includes(moduleSlug)) notFound();
}
