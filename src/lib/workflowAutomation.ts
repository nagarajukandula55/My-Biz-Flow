import type { Row } from "@/components/DataTable";
import { createBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";

/** Shared, tenant-scoped automation primitives used by vertical modules. */
export type WorkflowTrigger =
  | "invoice.overdue"
  | "stock.low"
  | "quotation.approved"
  | "workorder.completed"
  | "dealer.credit-exceeded"
  | "project.milestone-completed"
  | "procurement.rfq-created";

export type WorkflowAction =
  | { type: "create-task"; title: string; dueInDays?: number; assigneeId?: string }
  | { type: "send-notification"; channel: "telegram" | "email"; recipient?: string; template: string }
  | { type: "update-record"; moduleSlug: string; field: string; value: string };

export type WorkflowRule = {
  id?: string;
  name: string;
  enabled: boolean;
  trigger: WorkflowTrigger;
  moduleSlug: string;
  conditions?: Record<string, string | number | boolean>;
  actions: WorkflowAction[];
};

export type WorkflowEvent = {
  trigger: WorkflowTrigger;
  moduleSlug: string;
  recordId: string;
  record: Row;
};

const RULE_MODULE = "workflow-automation";
const TASK_MODULE = "workflow-task";

export async function listWorkflowRules(partnerId: string): Promise<Row[]> {
  return listBusinessRecords(partnerId, RULE_MODULE);
}

export async function saveWorkflowRule(partnerId: string, rule: WorkflowRule): Promise<Row> {
  if (!rule.name.trim()) throw new Error("Automation name is required.");
  if (!rule.actions.length) throw new Error("Add at least one automation action.");
  return createBusinessRecord(partnerId, RULE_MODULE, {
    ...rule,
    name: rule.name.trim(),
    enabled: Boolean(rule.enabled),
    conditions: rule.conditions ?? {},
    createdAt: new Date().toISOString(),
  });
}

function matches(rule: Row, event: WorkflowEvent): boolean {
  if (rule.enabled === false || rule.trigger !== event.trigger || rule.moduleSlug !== event.moduleSlug) return false;
  return Object.entries((rule.conditions ?? {}) as Record<string, unknown>).every(([field, expected]) => {
    const actual = event.record[field];
    return String(actual ?? "").toLowerCase() === String(expected).toLowerCase();
  });
}

/** Evaluates rules and records durable tasks/actions; callers can dispatch notifications after commit. */
export async function runWorkflowAutomations(partnerId: string, event: WorkflowEvent): Promise<Row[]> {
  const rules = await listWorkflowRules(partnerId);
  const created: Row[] = [];
  for (const rule of rules.filter((candidate) => matches(candidate, event))) {
    for (const action of (rule.actions as WorkflowAction[]) ?? []) {
      if (action.type === "create-task") {
        created.push(await createBusinessRecord(partnerId, TASK_MODULE, {
          title: action.title,
          status: "Open",
          sourceRuleId: rule.id,
          sourceModule: event.moduleSlug,
          sourceRecordId: event.recordId,
          dueDate: new Date(Date.now() + (action.dueInDays ?? 0) * 86400000).toISOString().slice(0, 10),
          assigneeId: action.assigneeId ?? "",
          createdAt: new Date().toISOString(),
        }));
      } else {
        created.push(await createBusinessRecord(partnerId, "workflow-action-log", {
          status: "Pending",
          action,
          sourceRuleId: rule.id,
          sourceModule: event.moduleSlug,
          sourceRecordId: event.recordId,
          createdAt: new Date().toISOString(),
        }));
      }
    }
  }
  return created;
}
