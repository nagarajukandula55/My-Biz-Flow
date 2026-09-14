import type { Column, Row } from "@/components/DataTable";
import type { KanbanCard, KanbanStage } from "@/components/KanbanBoard";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { NavGroup } from "@/components/AppShell";

// Service Centre "Workorders" module — realistic sample data, used only by
// the /design-system showcase page. Electronics/appliance repair, never
// vehicle service: see src/lib/sample-data/service-centre.ts's own domain
// note on why the two-wheeler framing this file used to carry was wrong.

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Diagnosed: "warning",
  "In repair": "amber",
  Ready: "teal",
  Delivered: "success",
  "On hold": "danger",
};

export const workorderColumns: Column[] = [
  { key: "id", label: "Job ID", type: "text" },
  { key: "customer", label: "Customer", type: "relation-link" },
  { key: "device", label: "Device", type: "text" },
  { key: "technician", label: "Technician", type: "text" },
  {
    key: "status",
    label: "Status",
    type: "select-chip",
    chipVariantMap: STATUS_VARIANT,
  },
  { key: "amount", label: "Amount", type: "currency" },
  { key: "dueDate", label: "Due Date", type: "date" },
];

export const workorderRows: Row[] = [
  {
    id: "WO-2291",
    customer: "Ravi Shankar",
    device: "Samsung Galaxy S23",
    technician: "Suresh M.",
    status: "In repair",
    amount: 3200,
    dueDate: "2026-08-09",
  },
  {
    id: "WO-2290",
    customer: "Priya Nair",
    device: "Dell Inspiron 15 3520",
    technician: "Arjun K.",
    status: "Ready",
    amount: 1450,
    dueDate: "2026-08-07",
  },
  {
    id: "WO-2289",
    customer: "Mohammed Faizal",
    device: "Xiaomi Redmi Note 12",
    technician: "Suresh M.",
    status: "Delivered",
    amount: 890,
    dueDate: "2026-08-05",
  },
  {
    id: "WO-2288",
    customer: "Anjali Deshmukh",
    device: "LG GL-T292RPZY Double Door",
    technician: "Vikram S.",
    status: "Diagnosed",
    amount: 5600,
    dueDate: "2026-08-10",
  },
  {
    id: "WO-2287",
    customer: "Karthik Iyer",
    device: 'Sony Bravia X75L 55"',
    technician: "Arjun K.",
    status: "On hold",
    amount: 7800,
    dueDate: "2026-08-12",
  },
  {
    id: "WO-2286",
    customer: "Fatima Sheikh",
    device: "Apple iPhone 14",
    technician: "Vikram S.",
    status: "Delivered",
    amount: 620,
    dueDate: "2026-08-03",
  },
];

export const workorderStages: KanbanStage[] = [
  { key: "diagnosed", label: "Diagnosed" },
  { key: "in-repair", label: "In repair" },
  { key: "ready", label: "Ready" },
  { key: "delivered", label: "Delivered" },
];

export const workorderCards: KanbanCard[] = [
  { id: "WO-2288", stageKey: "diagnosed", title: "WO-2288 · Anjali Deshmukh", meta: "LG GL-T292RPZY Double Door · Vikram S.", amount: 5600 },
  { id: "WO-2287", stageKey: "diagnosed", title: "WO-2287 · Karthik Iyer", meta: 'Sony Bravia X75L 55" · Arjun K.', amount: 7800 },
  { id: "WO-2291", stageKey: "in-repair", title: "WO-2291 · Ravi Shankar", meta: "Samsung Galaxy S23 · Suresh M.", amount: 3200 },
  { id: "WO-2290", stageKey: "ready", title: "WO-2290 · Priya Nair", meta: "Dell Inspiron 15 3520 · Arjun K.", amount: 1450 },
  { id: "WO-2289", stageKey: "delivered", title: "WO-2289 · Mohammed Faizal", meta: "Xiaomi Redmi Note 12 · Suresh M.", amount: 890 },
  { id: "WO-2286", stageKey: "delivered", title: "WO-2286 · Fatima Sheikh", meta: "Apple iPhone 14 · Vikram S.", amount: 620 },
];

export const sampleRecordFields: RecordField[] = [
  { label: "Job ID", value: "WO-2291", type: "text" },
  { label: "Customer", value: "Ravi Shankar", type: "relation" },
  { label: "Device", value: "Samsung Galaxy S23", type: "text" },
  { label: "Technician", value: "Suresh M.", type: "relation" },
  { label: "Status", value: "In repair", type: "select", chipVariant: "amber" },
  { label: "Amount", value: 3200, type: "currency" },
  { label: "Due Date", value: "2026-08-09", type: "date" },
  { label: "Warranty Claim", value: false, type: "boolean" },
];

export const sampleTimeline: TimelineEntry[] = [
  { id: "t1", label: "Job created", timestamp: "2026-08-04", actor: "Front desk" },
  { id: "t2", label: "Diagnosis completed — battery swelling", timestamp: "2026-08-05", actor: "Suresh M." },
  { id: "t3", label: "Parts ordered from partner", timestamp: "2026-08-06", actor: "Suresh M." },
  { id: "t4", label: "Repair in progress", timestamp: "2026-08-07", actor: "Suresh M." },
];

export const sampleRelated: RelatedRecord[] = [
  { id: "c1", title: "Ravi Shankar", subtitle: "Customer · 3 prior jobs" },
  { id: "v1", title: "Samsung Galaxy S23 · IMEI 356938035643809", subtitle: "Device" },
  { id: "i1", title: "INV-1188", subtitle: "Draft invoice · ₹3,200" },
];

export const sampleNavGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [{ key: "dashboard", label: "Dashboard", dot: "amber" }],
  },
  {
    title: "Service Centre",
    items: [
      { key: "workorders", label: "Workorders", dot: "teal" },
      { key: "customers", label: "Customers", dot: "teal" },
      { key: "inventory", label: "Inventory", dot: "teal" },
    ],
  },
  {
    title: "Cross-module",
    items: [
      { key: "invoices", label: "Invoices", dot: "neutral" },
      { key: "reports", label: "Reports", dot: "neutral" },
    ],
  },
];
