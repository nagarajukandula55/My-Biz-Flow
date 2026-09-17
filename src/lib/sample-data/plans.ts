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

// Only "yearly" is offered here -- per explicit direction ("billing cycle
// only yearly no monthly plans at all"), matching AN-CRM's real billing
// setup (its BILLING_PERIODS only ever offers Yearly/2-Years too -- see
// src/lib/subscriptionData.ts's own BILLING_CYCLES). `price` below is
// still a MONTHLY base rate (computeCyclePrice multiplies it out by 12 or
// 24 months) -- this field just records that a Plan's standard billing
// period is annual, not that customers are ever offered month-to-month.
export const PLAN_BILLING_CYCLE_OPTIONS = ["yearly"] as const;

export const planFormFields: FormFieldDef[] = [
  { key: "id", label: "Plan ID", type: "text", required: true, placeholder: "e.g. basic, pro, ultimate" },
  { key: "name", label: "Name", type: "text", required: true },
  { key: "price", label: "Standard price (monthly base rate)", type: "currency", required: true },
  { key: "launchPrice", label: "Launch price (monthly base rate, optional — introductory rate until the launch cutover)", type: "currency", required: false },
  { key: "billingCycle", label: "Billing Cycle", type: "select", required: true, options: [...PLAN_BILLING_CYCLE_OPTIONS] },
  { key: "maxUsers", label: "Max Users", type: "number", required: true },
  { key: "maxLocations", label: "Max Locations", type: "number", required: true },
  { key: "includedModuleSlugs", label: "Included Modules", type: "multi-select", required: true, options: ALL_MODULE_SLUGS },
  { key: "isPublic", label: "Public (shown on /pricing)", type: "boolean", required: false },
];
