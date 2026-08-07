import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Member sample data for the loyalty-rewards module — realistic field modeling,
// no backend wired up in this pass (see CLAUDE.md).

const STATUS_VARIANT: Record<string, StatusVariant> = {
  "Bronze": "neutral",
  "Silver": "neutral",
  "Gold": "amber",
  "Platinum": "teal"
};

export const loyaltyRewardsColumns: Column[] = [
  { key: "id", label: "Loyalty ID", type: "text" },
  { key: "customerName", label: "Customer Name", type: "text" },
  { key: "pointsBalance", label: "Points Balance", type: "text" },
  { key: "tier", label: "Tier", type: "select-chip", chipVariantMap: STATUS_VARIANT },
  { key: "lastRedemption", label: "Last Redemption", type: "date" },
  { key: "cashbackEarned", label: "Cashback Earned (lifetime)", type: "currency" },
  { key: "enrolledModule", label: "Enrolled Via Module", type: "select-chip" },
  { key: "status", label: "Status", type: "select-chip" },
];

export const loyaltyRewardsRows: Row[] = [
  {
    id: "LYT-4401",
    customerName: "Sameer Kapoor",
    pointsBalance: 3240,
    tier: "Gold",
    lastRedemption: "2026-07-28",
    cashbackEarned: 1860,
    enrolledModule: "POS",
    status: "Active",
  },
  {
    id: "LYT-4400",
    customerName: "Ritu Choudhary",
    pointsBalance: 890,
    tier: "Silver",
    lastRedemption: "2026-06-15",
    cashbackEarned: 420,
    enrolledModule: "Restaurant POS",
    status: "Active",
  },
  {
    id: "LYT-4399",
    customerName: "Vivek Anand",
    pointsBalance: 9120,
    tier: "Platinum",
    lastRedemption: "2026-08-02",
    cashbackEarned: 5100,
    enrolledModule: "Subscriptions",
    status: "Active",
  },
  {
    id: "LYT-4398",
    customerName: "Pooja Iyer",
    pointsBalance: 120,
    tier: "Bronze",
    lastRedemption: "2026-02-10",
    cashbackEarned: 60,
    enrolledModule: "Clinic",
    status: "Inactive",
  },
];

export const loyaltyRewardsFormFields: FormFieldDef[] = [
  { key: "id", label: "Loyalty ID", type: "text", required: true },
  { key: "customerName", label: "Customer Name", type: "text", required: true },
  { key: "pointsBalance", label: "Points Balance", type: "number", required: true },
  { key: "tier", label: "Tier", type: "select", required: true, options: ["Bronze","Silver","Gold","Platinum"] },
  { key: "lastRedemption", label: "Last Redemption", type: "date", required: false },
  { key: "cashbackEarned", label: "Cashback Earned (lifetime)", type: "currency", required: false },
  { key: "enrolledModule", label: "Enrolled Via Module", type: "select", required: false, options: ["POS","Restaurant POS","Clinic","Subscriptions"] },
  { key: "status", label: "Status", type: "select", required: true, options: ["Active","Inactive"] },
];

export function getLoyaltyRewardsRecord(recordId: string): Row {
  return loyaltyRewardsRows.find((r) => String(r["id"]) === recordId) ?? loyaltyRewardsRows[0];
}

export function getLoyaltyRewardsDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Loyalty ID", value: r["id"], type: "text" },
    { label: "Customer Name", value: r["customerName"], type: "text" },
    { label: "Points Balance", value: r["pointsBalance"], type: "text" },
    { label: "Tier", value: r["tier"], type: "select", chipVariant: STATUS_VARIANT[String(r["tier"])] ?? "neutral" },
    { label: "Last Redemption", value: r["lastRedemption"], type: "date" },
    { label: "Cashback Earned (lifetime)", value: r["cashbackEarned"], type: "currency" },
    { label: "Enrolled Via Module", value: r["enrolledModule"], type: "select", chipVariant: STATUS_VARIANT[String(r["enrolledModule"])] ?? "neutral" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
  ];
}

export function getLoyaltyRewardsTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Record created", timestamp: String(record["lastRedemption"] ?? "2026-08-01"), actor: "System" },
    { id: "t2", label: "Record last updated", timestamp: "2026-08-07", actor: "Admin User" },
  ];
}

export const loyaltyRewardsRelated: RelatedRecord[] = [];
