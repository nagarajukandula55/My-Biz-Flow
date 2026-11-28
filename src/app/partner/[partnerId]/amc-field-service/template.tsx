import type { ReactNode } from "react";
import { requireModuleTemplateAccess } from "@/lib/moduleTemplateAccess";

export default async function ModuleTemplate({ children }: { children: ReactNode }) {
  await requireModuleTemplateAccess("amc-field-service");
  return children;
}