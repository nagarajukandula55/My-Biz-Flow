import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { registerPage } from "@/lib/designer/registry";
import { listBusinessRecords } from "@/lib/businessRecords";
import {
  REPORT_SOURCES,
  REPORT_DEFINITIONS_MODULE,
  FILTER_OPERATORS,
  normaliseDefinition,
  resolveReportColumns,
  runReport,
  type ReportFilter,
} from "@/lib/reportBuilder";
import { saveReportDefinitionAction } from "@/lib/reportBuilderActions";

registerPage({
  id: "service-centre.reports",
  moduleSlug: "service-centre",
  title: "Service Centre — Report Builder",
  path: "/partner/[partnerId]/service-centre/reports",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Pick a source module + fields + simple filters and run it against the partner's own real BusinessRecords — no cross-module joins, no export, no scheduling. Definitions can be saved and re-run. Field discovery reuses each module's existing Column export.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/reports/page.tsx",
});

const FILTER_ROW_COUNT = 3;

type SearchParams = {
  source?: string;
  fields?: string | string[];
  recordKey?: string;
  name?: string;
} & Record<string, string | undefined>;

export const dynamic = "force-dynamic";

export default async function ReportBuilderPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: SearchParams;
}) {
  const savedReports = await listBusinessRecords(params.partnerId, REPORT_DEFINITIONS_MODULE);

  const rawFields = searchParams.fields;
  const fields = Array.isArray(rawFields) ? rawFields : rawFields ? [rawFields] : [];

  const filters: ReportFilter[] = [];
  for (let i = 0; i < FILTER_ROW_COUNT; i++) {
    const field = searchParams[`filter${i}_field`];
    const operator = searchParams[`filter${i}_op`];
    const value = searchParams[`filter${i}_value`] ?? "";
    if (field && operator) filters.push({ field, operator: operator as ReportFilter["operator"], value });
  }

  const definition = searchParams.source
    ? normaliseDefinition({ name: searchParams.name, source: searchParams.source, fields, filters })
    : undefined;

  const source = definition ? REPORT_SOURCES.find((s) => s.slug === definition.source) : undefined;
  const result = definition ? await runReport(params.partnerId, definition) : undefined;
  const outputColumns = definition ? resolveReportColumns(definition) : [];

  const qsForAction = definition ? JSON.stringify({ source: definition.source, fields: definition.fields, filters: definition.filters }) : "";

  return (
    <AppShell topbarTitle="Report Builder">
      <div className="space-y-6">
        <p className="text-sm text-text-muted">
          Pick a data source, choose which fields to show, and optionally filter — runs against your own real records
          only. Save a definition to re-run it later.
        </p>

        {savedReports.length > 0 && (
          <div className="rounded-lg border border-border bg-bg-raised p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Saved reports</div>
            <ul className="mt-2 space-y-1">
              {savedReports.map((r) => (
                <li key={String(r.id)}>
                  <Link
                    href={{
                      pathname: `/partner/${params.partnerId}/service-centre/reports`,
                      query: {
                        source: String(r.source ?? ""),
                        fields: (r.fields as string[] | undefined) ?? [],
                        name: String(r.name ?? ""),
                        recordKey: String(r.id),
                        ...Object.fromEntries(
                          ((r.filters as ReportFilter[] | undefined) ?? []).flatMap((f, i) => [
                            [`filter${i}_field`, f.field],
                            [`filter${i}_op`, f.operator],
                            [`filter${i}_value`, f.value],
                          ])
                        ),
                      },
                    }}
                    className="text-sm font-semibold text-accent hover:underline"
                  >
                    {String(r.name)}
                  </Link>
                  <span className="ml-2 text-xs text-text-muted">
                    ({REPORT_SOURCES.find((s) => s.slug === r.source)?.label ?? String(r.source)})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form method="get" className="space-y-4 rounded-lg border border-border bg-bg-raised p-4">
          <input type="hidden" name="recordKey" value={searchParams.recordKey ?? ""} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Report name
              <input
                type="text"
                name="name"
                defaultValue={searchParams.name ?? ""}
                placeholder="e.g. Open workorders this month"
                className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Data source
              <select
                name="source"
                defaultValue={searchParams.source ?? ""}
                className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
              >
                <option value="">Choose a source…</option>
                {Object.entries(
                  REPORT_SOURCES.reduce<Record<string, typeof REPORT_SOURCES>>((acc, s) => {
                    (acc[s.group] ??= []).push(s);
                    return acc;
                  }, {})
                ).map(([group, sources]) => (
                  <optgroup key={group} label={group}>
                    {sources.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>

          {source && (
            <>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Fields (none checked = all fields)
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                  {source.columns.map((c) => (
                    <label key={c.key} className="flex items-center gap-1.5 text-sm text-text">
                      <input type="checkbox" name="fields" value={c.key} defaultChecked={fields.includes(c.key)} />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Filters</div>
                {Array.from({ length: FILTER_ROW_COUNT }).map((_, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <select
                      name={`filter${i}_field`}
                      defaultValue={searchParams[`filter${i}_field`] ?? ""}
                      className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
                    >
                      <option value="">—</option>
                      {source.columns.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <select
                      name={`filter${i}_op`}
                      defaultValue={searchParams[`filter${i}_op`] ?? "eq"}
                      className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
                    >
                      {FILTER_OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      name={`filter${i}_value`}
                      defaultValue={searchParams[`filter${i}_value`] ?? ""}
                      placeholder="value"
                      className="w-40 rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex items-center gap-3">
            <button type="submit" className="btn-accent">
              Run report
            </button>
            {source && (
              <Link href={`/partner/${params.partnerId}/service-centre/reports`} className="btn-outline">
                Clear
              </Link>
            )}
          </div>
        </form>

        {definition && source && (
          <div className="space-y-3">
            <form action={saveReportDefinitionAction.bind(null, params.partnerId)}>
              <input type="hidden" name="definition" value={qsForAction} />
              <input type="hidden" name="name" value={definition.name} />
              <input type="hidden" name="recordKey" value={searchParams.recordKey ?? ""} />
              <div className="flex items-center justify-between">
                <div className="text-sm text-text-muted">
                  {result ? (
                    <>
                      {result.total} row{result.total === 1 ? "" : "s"}
                      {result.truncated ? ` (showing first ${result.rows.length})` : ""}
                    </>
                  ) : null}
                </div>
                <button type="submit" className="btn-outline">
                  {searchParams.recordKey ? "Update saved report" : "Save this report"}
                </button>
              </div>
            </form>
            <DataTable columns={outputColumns} rows={result?.rows ?? []} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
