import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// Vendor team-member ("User") data — top tier of the three-level vendor
// RBAC model: User -> Role -> Access Group -> modules. Roles are real,
// Prisma-backed data (see src/lib/designer/rolesData.ts) — but that store
// isn't client-importable (pulls in Prisma), and this file is (see
// UserClientTable), so ROLE_NAMES stays a static fallback list here.
//
// Persisted as a real BusinessRecord (moduleSlug "users") like every other
// module — see src/lib/businessRecords.ts. This is a VENDOR's own team
// member (e.g. "Meena R., Cashier at this store"), completely distinct
// from central-api's `PlatformUser` (the cross-tenant login identity for
// the whole platform). No central-api integration or real per-user
// authentication is built here — that's out of scope, see CLAUDE.md's
// integration constraints. Logging in as this User is not yet possible;
// this only tracks who's on the team and what Role they hold.

const ROLE_NAMES = ["Cashier", "Technician", "Accountant", "Owner / Admin"];

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Active: "success",
  Invited: "warning",
  Suspended: "danger",
};

export const userColumns: Column[] = [
  { key: "id", label: "Name", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "role", label: "Role", type: "relation-link" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
  { key: "lastLogin", label: "Last Login", type: "date" },
];

export const userFormFields: FormFieldDef[] = [
  { key: "id", label: "Name", type: "text", required: true },
  { key: "email", label: "Email", type: "text", required: true },
  { key: "role", label: "Role", type: "select", required: true, options: ROLE_NAMES },
  { key: "status", label: "Status", type: "select", required: true, options: ["Active", "Invited", "Suspended"] },
  { key: "lastLogin", label: "Last Login", type: "date", required: false },
];

export function getUserDetailFields(record: Row): RecordField[] {
  return [
    { label: "Name", value: record["id"], type: "text" },
    { label: "Email", value: record["email"], type: "text" },
    { label: "Role", value: record["role"], type: "relation" },
    { label: "Status", value: record["status"], type: "select", chipVariant: STATUS_VARIANT[String(record["status"])] ?? "neutral" },
    { label: "Last Login", value: record["lastLogin"], type: "date" },
  ];
}

export function getUserTimeline(record: Row): TimelineEntry[] {
  return [{ id: "t1", label: `User "${record["id"]}" added to the vendor account`, timestamp: String(record["lastLogin"] ?? "") }];
}

export const userRelated: RelatedRecord[] = [];
