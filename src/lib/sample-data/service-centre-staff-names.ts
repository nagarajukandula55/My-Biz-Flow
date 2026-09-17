import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { FormFieldDef } from "@/components/RecordForm";

/**
 * "Staff Names" — a partner-owned roster of the PEOPLE NAMES that get typed
 * into a workorder's three mandatory who-did-this fields:
 *
 *   - Logged By (CCO Name)      — intake, mirrors AN-CRM's `ccoName`
 *   - Engineer / Serviced By    — handover, mirrors AN-CRM's close-route `engineerName`
 *   - Collected By              — handover, mirrors AN-CRM's `paymentCollectedByName`
 *
 * WHAT THIS IS NOT
 * ----------------
 * It is NOT a login, an account, or an assignment mechanism. There is no
 * password, no session, no email, and no "assign this job to X" anywhere in
 * Service Centre — a workorder is never allocated to a person, it only
 * records, after the fact, whose name goes on the paperwork. The old
 * PartnerStaff-backed Technician roster and its assignment picker were
 * removed outright; this replaces the *only* part of it that was ever
 * useful (a list of names to pick from) with plain partner data.
 *
 * Being a BusinessRecord module means it gets the whole existing catalog
 * apparatus for free — the same CRUD pages, the same Designer
 * customization hooks, and the same per-page plan gate — exactly like the
 * Brands and Models catalogs. Its pages are Pro (`service-centre.staff-names.*`
 * in DEFAULT_PAGE_TIERS), so a Starter partner simply types a name into the
 * three fields each time with no suggestions, while a Pro+ partner who
 * maintains this roster gets it offered as the suggestion list on all three.
 */

/** Roles are a free label on the row — they narrow nothing and gate nothing; they only make a long roster readable. */
export const SC_STAFF_ROLES = ["Front Desk / CCO", "Engineer / Technician", "Manager", "Owner", "Other"] as const;

export const scStaffNameColumns: Column[] = [
  { key: "id", label: "Staff Code", type: "text" },
  { key: "name", label: "Name", type: "text" },
  { key: "role", label: "Role", type: "select-chip" },
  { key: "status", label: "Status", type: "select-chip" },
];

export const scStaffNameFormFields: FormFieldDef[] = [
  { key: "id", label: "Staff Code", type: "text", required: false, placeholder: "Auto-generated if left empty" },
  { key: "name", label: "Name", type: "text", required: true, placeholder: "e.g. Suresh M." },
  {
    key: "role",
    label: "Role",
    type: "select",
    required: false,
    options: [...SC_STAFF_ROLES],
    help: "A label only — it does not restrict which of the three name fields this person can be picked for.",
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    required: true,
    options: ["Active", "Inactive"],
    help: "Inactive names stop being suggested on new workorders but stay on the jobs they already appear on.",
  },
];

export function getScStaffNameDetailFields(record: Row): RecordField[] {
  return [
    { label: "Staff Code", value: record["id"], type: "text" },
    { label: "Name", value: record["name"], type: "text" },
    { label: "Role", value: record["role"], type: "text" },
    { label: "Status", value: record["status"], type: "select" },
  ];
}

export function getScStaffNameTimeline(record: Row): TimelineEntry[] {
  return [{ id: "t1", label: `Staff name "${record["name"]}" added to the roster`, timestamp: String(record["createdAt"] ?? "") }];
}

export const scStaffNameRelated: RelatedRecord[] = [];

/**
 * The Active names on this partner's roster, sorted, ready to hand to a
 * RecordForm field's `suggestions` (or a <datalist>). An empty array is the
 * normal, correct state for a Starter partner — the consuming field then
 * renders as plain free text.
 */
export function activeStaffNames(rows: Record<string, unknown>[]): string[] {
  const names = new Set<string>();
  for (const row of rows) {
    if (String(row["status"] ?? "Active") !== "Active") continue;
    const name = String(row["name"] ?? "").trim();
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}
