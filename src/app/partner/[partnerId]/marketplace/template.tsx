import type { ReactNode } from "react";
import { getVisibleModuleSlugs } from "@/lib/designer/entitlements";
import { notFound } from "next/navigation";

export default async function ModuleTemplate({ children, params }: { children: ReactNode; params: { partnerId: string } }) {
  if (!(await getVisibleModuleSlugs(params.partnerId)).includes("marketplace")) notFound();
  return children;
}
