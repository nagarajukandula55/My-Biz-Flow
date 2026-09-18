/**
 * Report Builder — the data layer behind /partner/[partnerId]/service-centre/reports.
 *
 * A "report definition" is: one source module + which of that module's
 * columns to show + zero or more simple field/operator/value filters. It is
 * run against the same BusinessRecord store every module list page reads,
 * with the same partnerId scoping, so a report can never show another
 * partner's rows and can never show a field the module doesn't actually
 * define.
 *
 * Deliberate scope (a complete v1, not a stub): ONE source per report, no
 * cross-module joins, no grouping/aggregation, no CSV export, no scheduled
 * runs. Field discovery reuses each module's existing `columns` export —
 * there is no second field-registry to keep in sync. Ported from AN-CRM's
 * console/common/report-builder, which is backed by its own bespoke
 * ReportDefinition model; here a definition is just another BusinessRecord
 * (moduleSlug REPORT_DEFINITIONS_MODULE), so it inherits partner scoping,
 * listing and deletion from src/lib/businessRecords.ts for free.
 */
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { Column, Row } from "@/components/DataTable";

import { serviceCentreColumns } from "@/lib/sample-data/service-centre";
import { scBrandColumns } from "@/lib/sample-data/service-centre-brands";
import { scModelColumns } from "@/lib/sample-data/service-centre-models";
import { scFaultCodeColumns } from "@/lib/sample-data/service-centre-fault-codes";
import { scSymptomCodeColumns } from "@/lib/sample-data/service-centre-symptom-codes";
import { scProfileColumns } from "@/lib/sample-data/service-centre-sc-profile";
import { solutionsColumns } from "@/lib/sample-data/solutions";
import { billingColumns } from "@/lib/sample-data/billing";
import { billingPaymentColumns } from "@/lib/sample-data/billing-payments";
import { billingContactColumns } from "@/lib/sample-data/billing-contacts";
import { billingItemColumns } from "@/lib/sample-data/billing-items";
import { expenseColumns } from "@/lib/sample-data/billing-expenses";
import { creditNoteColumns } from "@/lib/sample-data/billing-credit-notes";
import { quotationColumns, deliveryChallanColumns, proformaInvoiceColumns } from "@/lib/sample-data/billing-sales-documents";
import { bomColumns } from "@/lib/sample-data/bom";
import { stockColumns, stockAdjustmentColumns, stockTransferColumns, stockTakeColumns, returnOrderColumns, partOrderColumns, warehouseColumns } from "@/lib/sample-data/warehouse";

/** BusinessRecord moduleSlug the saved definitions themselves live under. */
export const REPORT_DEFINITIONS_MODULE = "report-definitions";

export type ReportSource = {
  slug: string;
  label: string;
  /** Which product area this source belongs to — used only to group the picker. */
  group: string;
  columns: Column[];
};

/**
 * Every module a Service Centre partner actually has records in, listed
 * explicitly (same "enumerate, don't rely on dynamic magic" convention as
 * src/lib/moduleData.ts / designer/registerAll.ts). Each entry's `columns`
 * is that module's real, existing Column export — the exact same definition
 * its own list page renders.
 */
export const REPORT_SOURCES: ReportSource[] = [
  { slug: "service-centre", label: "Workorders", group: "Service Centre", columns: serviceCentreColumns },
  { slug: "service-centre-sc-profile", label: "SC Profiles", group: "Service Centre", columns: scProfileColumns },
  { slug: "service-centre-brands", label: "Brands", group: "Service Centre", columns: scBrandColumns },
  { slug: "service-centre-models", label: "Models", group: "Service Centre", columns: scModelColumns },
  { slug: "service-centre-solutions", label: "Solutions", group: "Service Centre", columns: solutionsColumns },
  { slug: "service-centre-fault-codes", label: "Fault Codes", group: "Service Centre", columns: scFaultCodeColumns },
  { slug: "service-centre-symptom-codes", label: "Symptom Codes", group: "Service Centre", columns: scSymptomCodeColumns },
  { slug: "billing", label: "Invoices", group: "Billing", columns: billingColumns },
  { slug: "billing-payments", label: "Payments", group: "Billing", columns: billingPaymentColumns },
  { slug: "billing-contacts", label: "Contacts", group: "Billing", columns: billingContactColumns },
  { slug: "billing-items", label: "Items", group: "Billing", columns: billingItemColumns },
  { slug: "billing-expenses", label: "Expenses", group: "Billing", columns: expenseColumns },
  { slug: "billing-credit-notes", label: "Credit/Debit Notes", group: "Billing", columns: creditNoteColumns },
  { slug: "billing-quotations", label: "Quotations", group: "Billing", columns: quotationColumns },
  { slug: "billing-delivery-challans", label: "Delivery Challans", group: "Billing", columns: deliveryChallanColumns },
  { slug: "billing-proforma-invoices", label: "Proforma Invoices", group: "Billing", columns: proformaInvoiceColumns },
  { slug: "inventory-bom", label: "Material Catalog (BOM)", group: "Inventory", columns: bomColumns },
  { slug: "inventory-warehouses", label: "Warehouses", group: "Inventory", columns: warehouseColumns },
  { slug: "inventory-stock", label: "Stock", group: "Inventory", columns: stockColumns },
  { slug: "inventory-stock-adjustments", label: "Stock Adjustments", group: "Inventory", columns: stockAdjustmentColumns },
  { slug: "inventory-stock-transfers", label: "Stock Transfers", group: "Inventory", columns: stockTransferColumns },
  { slug: "inventory-stock-take", label: "Stock Take", group: "Inventory", columns: stockTakeColumns },
  { slug: "inventory-return-orders", label: "Return Orders", group: "Inventory", columns: returnOrderColumns },
  { slug: "inventory-part-orders", label: "Part Orders", group: "Inventory", columns: partOrderColumns },
];

export function getReportSource(slug: string): ReportSource | undefined {
  return REPORT_SOURCES.find((s) => s.slug === slug);
}

export const FILTER_OPERATORS = [
  { value: "eq", label: "is" },
  { value: "ne", label: "is not" },
  { value: "contains", label: "contains" },
  { value: "gte", label: "is at least / on or after" },
  { value: "lte", label: "is at most / on or before" },
  { value: "notEmpty", label: "is filled in" },
] as const;

export type FilterOperator = (typeof FILTER_OPERATORS)[number]["value"];

export function isFilterOperator(value: string): value is FilterOperator {
  return FILTER_OPERATORS.some((op) => op.value === value);
}

export type ReportFilter = {
  field: string;
  operator: FilterOperator;
  value: string;
};

export type ReportDefinition = {
  name: string;
  source: string;
  /** Column keys to display, in order. Empty means "all of the source's columns". */
  fields: string[];
  filters: ReportFilter[];
};

/** Max rows a single run returns — a report is a read-only view, not an export. */
export const REPORT_ROW_LIMIT = 500;

/**
 * Validates + normalises an untrusted definition (URL searchParams, or a
 * saved record's JSON) against the real source registry: an unknown source,
 * an unknown field, or an unknown operator is dropped rather than trusted.
 * Returns undefined if the source itself isn't real.
 */
export function normaliseDefinition(input: {
  name?: unknown;
  source?: unknown;
  fields?: unknown;
  filters?: unknown;
}): ReportDefinition | undefined {
  const source = getReportSource(String(input.source ?? ""));
  if (!source) return undefined;

  const validKeys = new Set(source.columns.map((c) => c.key));

  const rawFields = Array.isArray(input.fields) ? input.fields : [];
  const fields = rawFields.map((f) => String(f)).filter((f) => validKeys.has(f));

  const rawFilters = Array.isArray(input.filters) ? input.filters : [];
  const filters: ReportFilter[] = [];
  for (const raw of rawFilters) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const field = String(r.field ?? "");
    const operator = String(r.operator ?? "");
    const value = String(r.value ?? "");
    if (!validKeys.has(field) || !isFilterOperator(operator)) continue;
    if (operator !== "notEmpty" && !value.trim()) continue;
    filters.push({ field, operator, value });
  }

  return {
    name: String(input.name ?? "").trim() || `${source.label} report`,
    source: source.slug,
    fields,
    filters,
  };
}

/** The columns a run should render — the picked subset, in the source's own order, or all of them. */
export function resolveReportColumns(definition: ReportDefinition): Column[] {
  const source = getReportSource(definition.source);
  if (!source) return [];
  if (definition.fields.length === 0) return source.columns;
  return source.columns.filter((c) => definition.fields.includes(c.key));
}

/**
 * Runs a definition against the partner's real BusinessRecords. Filters are
 * pushed down into the same Prisma JSON-path query
 * listBusinessRecordsPaginated uses for the Service Centre list page's
 * server-side filters — the database does the filtering, not JS over a
 * fully-loaded table.
 */
export async function runReport(
  partnerId: string,
  definition: ReportDefinition
): Promise<{ rows: Row[]; total: number; truncated: boolean }> {
  const source = getReportSource(definition.source);
  if (!source) return { rows: [], total: 0, truncated: false };

  const and: Prisma.BusinessRecordWhereInput[] = [];
  for (const filter of definition.filters) {
    const path = [filter.field];
    switch (filter.operator) {
      case "eq":
        and.push({ data: { path, equals: filter.value } as any });
        break;
      case "ne":
        and.push({ NOT: { data: { path, equals: filter.value } as any } });
        break;
      case "contains":
        and.push({ data: { path, string_contains: filter.value, mode: "insensitive" } as any });
        break;
      case "gte":
        and.push({ data: { path, gte: filter.value } as any });
        break;
      case "lte":
        and.push({ data: { path, lte: filter.value } as any });
        break;
      case "notEmpty":
        and.push({ NOT: { data: { path, equals: "" } as any } });
        break;
    }
  }

  const where: Prisma.BusinessRecordWhereInput = {
    partnerId,
    moduleSlug: source.slug,
    ...(and.length > 0 ? { AND: and } : {}),
  };

  const [records, total] = await Promise.all([
    prisma.businessRecord.findMany({ where, orderBy: { createdAt: "desc" }, take: REPORT_ROW_LIMIT }),
    prisma.businessRecord.count({ where }),
  ]);

  return {
    rows: records.map((r) => ({ ...(r.data as Record<string, unknown>), id: r.recordKey })),
    total,
    truncated: total > records.length,
  };
}
