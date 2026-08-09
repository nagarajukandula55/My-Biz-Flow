import type { Column } from "@/components/DataTable";
import type { FormFieldDef } from "@/components/RecordForm";
import { MODULES } from "@/lib/designer/modules";

// Plan column/schema definitions only — real Plan data lives in the Plan
// Prisma table (see src/lib/plansData.ts). Kept here (client-safe, no
// Prisma import) since PlanClientTable is a Client Component.

export const ALL_MODULE_SLUGS = MODULES.map((m) => m.slug);

export const planColumns: Column[] = [
  { key: "id", label: "Plan ID", type: "text" },
  { key: "name", label: "Name", type: "text" },
  { key: "price", label: "Price", type: "currency" },
  { key: "billingCycle", label: "Billing Cycle", type: "select-chip" },
  { key: "maxUsers", label: "Max Users", type: "text" },
  { key: "maxLocations", label: "Max Locations", type: "text" },
  { key: "includedModuleSlugs", label: "Included Modules", type: "multi-chip" },
  { key: "isPublic", label: "Public", type: "select-chip" },
];

export const planFormFields: FormFieldDef[] = [
  { key: "id", label: "Plan ID", type: "text", required: true, placeholder: "e.g. basic, pro, ultimate" },
  { key: "name", label: "Name", type: "text", required: true },
  { key: "price", label: "Price (per cycle)", type: "currency", required: true },
  { key: "billingCycle", label: "Billing Cycle", type: "select", required: true, options: ["monthly", "yearly"] },
  { key: "maxUsers", label: "Max Users", type: "number", required: true },
  { key: "maxLocations", label: "Max Locations", type: "number", required: true },
  { key: "includedModuleSlugs", label: "Included Modules", type: "multi-select", required: true, options: ALL_MODULE_SLUGS },
  { key: "isPublic", label: "Public (shown on /pricing)", type: "boolean", required: false },
];
