import type { Column, Row } from "@/components/DataTable";
import type { KanbanCard, KanbanStage } from "@/components/KanbanBoard";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { NavGroup } from "@/components/AppShell";

// Service Centre "Workorders" module — realistic sample data.

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
  { key: "vehicle", label: "Vehicle", type: "text" },
  { key: "technician", label: "Technician", type: "text" },
  {
    key: "status",
    label: "Status",
    type: "select-chip",
    chipVariant: (value) => STATUS_VARIANT[String(value)] ?? "neutral",
  },
  { key: "amount", label: "Amount", type: "currency" },
  { key: "dueDate", label: "Due Date", type: "date" },
];

export const workorderRows: Row[] = [
  {
    id: "WO-2291",
    customer: "Ravi Shankar",
    vehicle: "Honda Activa 6G",
    technician: "Suresh M.",
    status: "In repair",
    amount: 3200,
    dueDate: "2026-08-09",
  },
  {
    id: "WO-2290",
    customer: "Priya Nair",
    vehicle: "TVS Jupiter",
    technician: "Arjun K.",
    status: "Ready",
    amount: 1450,
    dueDate: "2026-08-07",
  },
  {
    id: "WO-2289",
    customer: "Mohammed Faizal",
    vehicle: "Hero Splendor+",
    technician: "Suresh M.",
    status: "Delivered",
    amount: 890,
    dueDate: "2026-08-05",
  },
  {
    id: "WO-2288",
    customer: "Anjali Deshmukh",
    vehicle: "Bajaj Pulsar 150",
    technician: "Vikram S.",
    status: "Diagnosed",
    amount: 5600,
    dueDate: "2026-08-10",
  },
  {
    id: "WO-2287",
    customer: "Karthik Iyer",
    vehicle: "Royal Enfield Classic 350",
    technician: "Arjun K.",
    status: "On hold",
    amount: 7800,
    dueDate: "2026-08-12",
  },
  {
    id: "WO-2286",
    customer: "Fatima Sheikh",
    vehicle: "Yamaha Fascino",
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
  { id: "WO-2288", stageKey: "diagnosed", title: "WO-2288 · Anjali Deshmukh", meta: "Bajaj Pulsar 150 · Vikram S.", amount: 5600 },
  { id: "WO-2287", stageKey: "diagnosed", title: "WO-2287 · Karthik Iyer", meta: "Royal Enfield Classic 350 · Arjun K.", amount: 7800 },
  { id: "WO-2291", stageKey: "in-repair", title: "WO-2291 · Ravi Shankar", meta: "Honda Activa 6G · Suresh M.", amount: 3200 },
  { id: "WO-2290", stageKey: "ready", title: "WO-2290 · Priya Nair", meta: "TVS Jupiter · Arjun K.", amount: 1450 },
  { id: "WO-2289", stageKey: "delivered", title: "WO-2289 · Mohammed Faizal", meta: "Hero Splendor+ · Suresh M.", amount: 890 },
  { id: "WO-2286", stageKey: "delivered", title: "WO-2286 · Fatima Sheikh", meta: "Yamaha Fascino · Vikram S.", amount: 620 },
];

export const sampleRecordFields: RecordField[] = [
  { label: "Job ID", value: "WO-2291", type: "text" },
  { label: "Customer", value: "Ravi Shankar", type: "relation" },
  { label: "Vehicle", value: "Honda Activa 6G", type: "text" },
  { label: "Technician", value: "Suresh M.", type: "relation" },
  { label: "Status", value: "In repair", type: "select", chipVariant: "amber" },
  { label: "Amount", value: 3200, type: "currency" },
  { label: "Due Date", value: "2026-08-09", type: "date" },
  { label: "Warranty Claim", value: false, type: "boolean" },
];

export const sampleTimeline: TimelineEntry[] = [
  { id: "t1", label: "Job created", timestamp: "2026-08-04", actor: "Front desk" },
  { id: "t2", label: "Diagnosis completed — clutch plate wear", timestamp: "2026-08-05", actor: "Suresh M." },
  { id: "t3", label: "Parts ordered from vendor", timestamp: "2026-08-06", actor: "Suresh M." },
  { id: "t4", label: "Repair in progress", timestamp: "2026-08-07", actor: "Suresh M." },
];

export const sampleRelated: RelatedRecord[] = [
  { id: "c1", title: "Ravi Shankar", subtitle: "Customer · 3 prior jobs" },
  { id: "v1", title: "Honda Activa 6G · KA-05-AB-2291", subtitle: "Vehicle" },
  { id: "i1", title: "INV-1188", subtitle: "Draft invoice · ₹3,200" },
];

export const sampleNavGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [{ key: "dashboard", label: "Dashboard", dot: "amber", active: true }],
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
