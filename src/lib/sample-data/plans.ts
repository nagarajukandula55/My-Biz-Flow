import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { FormFieldDef } from "@/components/RecordForm";
import { MODULES } from "@/lib/designer/modules";

// Plan sample data — Basic/Pro/Ultimate, Super-Admin configurable via
// /admin/plans. Also the single source of truth read by the public
// /pricing page, so pricing can never drift from what Super Admin set.
// No-code stays no-code at every tier — modules/seats are what's gated,
// not feature flags on the builder itself.

const ALL_MODULE_SLUGS = MODULES.map((m) => m.slug);

export type Plan = {
  id: string;
  name: string;
  price: number;
  billingCycle: "monthly" | "yearly";
  includedModuleSlugs: string[];
  maxUsers: number;
  maxLocations: number;
  isPublic: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    price: 999,
    billingCycle: "monthly",
    includedModuleSlugs: ["pos", "billing"],
    maxUsers: 3,
    maxLocations: 1,
    isPublic: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: 2999,
    billingCycle: "monthly",
    includedModuleSlugs: [
      "pos",
      "billing",
      "service-centre",
      "inventory",
      "clinic",
      "subscriptions",
      "accounting-gst",
      "loyalty-rewards",
      "hrms",
    ],
    maxUsers: 15,
    maxLocations: 3,
    isPublic: true,
  },
  {
    id: "ultimate",
    name: "Ultimate",
    price: 7999,
    billingCycle: "monthly",
    includedModuleSlugs: ALL_MODULE_SLUGS,
    maxUsers: 100,
    maxLocations: 25,
    isPublic: true,
  },
];

export function getPlan(planId: string): Plan | undefined {
  return PLANS.find((p) => p.id === planId);
}

// --- DataTable / RecordForm / RecordDetail plumbing for /admin/plans CRUD ---

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

export const planRows: Row[] = PLANS.map((p) => ({ ...p, isPublic: p.isPublic ? "Yes" : "No" }));

export const planFormFields: FormFieldDef[] = [
  { key: "id", label: "Plan ID", type: "text", required: true },
  { key: "name", label: "Name", type: "text", required: true },
  { key: "price", label: "Price (per cycle)", type: "currency", required: true },
  { key: "billingCycle", label: "Billing Cycle", type: "select", required: true, options: ["monthly", "yearly"] },
  { key: "maxUsers", label: "Max Users", type: "number", required: true },
  { key: "maxLocations", label: "Max Locations", type: "number", required: true },
  { key: "includedModuleSlugs", label: "Included Modules", type: "multi-select", required: true, options: ALL_MODULE_SLUGS },
  { key: "isPublic", label: "Public (shown on /pricing)", type: "boolean", required: false },
];

export function getPlanRecord(recordId: string): Row {
  return planRows.find((r) => String(r["id"]) === recordId) ?? planRows[0];
}

export function getPlanDetailFields(record: Row): RecordField[] {
  return [
    { label: "Plan ID", value: record["id"], type: "text" },
    { label: "Name", value: record["name"], type: "text" },
    { label: "Price (per cycle)", value: record["price"], type: "currency" },
    { label: "Billing Cycle", value: record["billingCycle"], type: "select", chipVariant: "teal" },
    { label: "Max Users", value: record["maxUsers"], type: "text" },
    { label: "Max Locations", value: record["maxLocations"], type: "text" },
    { label: "Included Modules", value: record["includedModuleSlugs"], type: "multi-select" },
    { label: "Public", value: record["isPublic"], type: "text" },
  ];
}

export function getPlanTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: `Plan "${record["name"]}" seeded`, timestamp: "2026-01-01T00:00:00", actor: "Super Admin" },
    { id: "t2", label: "Price and module list last reviewed", timestamp: "2026-07-01T00:00:00", actor: "Super Admin" },
  ];
}

export const planRelated: RelatedRecord[] = [];
