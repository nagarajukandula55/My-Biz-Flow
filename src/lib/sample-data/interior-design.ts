import type { Column } from "@/components/DataTable";
import type { FormFieldDef } from "@/components/RecordForm";

export const interiorDesignColumns: Column[] = [
  { key: "id", label: "Project / BOQ No.", type: "text" }, { key: "projectName", label: "Project", type: "text" },
  { key: "customer", label: "Customer", type: "text" }, { key: "site", label: "Site", type: "text" },
  { key: "status", label: "Status", type: "select-chip" }, { key: "progressPercent", label: "Progress", type: "percentage" },
  { key: "estimatedTotal", label: "Estimated Total", type: "currency" },
];

export const interiorDesignFields: FormFieldDef[] = [
  { key: "projectName", label: "Project Name", type: "text", required: true },
  { key: "customer", label: "Customer", type: "text", required: true },
  { key: "site", label: "Site / Address", type: "textarea", required: true },
  { key: "room", label: "Room / Area", type: "text", required: false, placeholder: "Living room, kitchen, master bedroom…" },
  { key: "measurementNotes", label: "Measurements / Scope Notes", type: "textarea", required: false },
  { key: "boqLines", label: "BOQ Lines (JSON)", type: "textarea", required: false, placeholder: '[{"material":"Carpet","quantity":2,"unit":"sq.m","unitPrice":450,"wastagePercent":5}]' },
  { key: "status", label: "Status", type: "select", required: true, options: ["Draft", "Submitted", "Approved", "In Progress", "Partially Billed", "Completed", "Cancelled"] },
  { key: "progressPercent", label: "Progress %", type: "number", required: false },
  { key: "estimatedTotal", label: "Estimated Total", type: "currency", required: false },
  { key: "billedTotal", label: "Billed Total", type: "currency", required: false },
  { key: "notes", label: "Notes", type: "textarea", required: false },
];
