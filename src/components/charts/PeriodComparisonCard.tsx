"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrencyINR } from "@/lib/format";
import type { PeriodComparison, PeriodGranularity } from "@/lib/analyticsData";

const GRANULARITIES: { key: PeriodGranularity; label: string }[] = [
  { key: "DAY", label: "Daily" },
  { key: "WEEK", label: "Weekly" },
  { key: "MONTH", label: "Monthly" },
  { key: "YEAR", label: "Yearly" },
];

/**
 * Year-on-date comparison view — this period vs. the same period exactly
 * one calendar year earlier, for both revenue and workorder volume. All
 * four granularities' data is computed server-side (getPeriodComparison,
 * src/lib/analyticsData.ts) and passed in as one prop; switching the
 * Daily/Weekly/Monthly/Yearly tab below is a client-side view toggle over
 * data already on the page, not a client fetch.
 */
const GRANULARITY_KEY: Record<PeriodGranularity, keyof PeriodComparison> = {
  DAY: "daily",
  WEEK: "weekly",
  MONTH: "monthly",
  YEAR: "yearly",
};

export function PeriodComparisonCard({ data }: { data: PeriodComparison }) {
  const [granularity, setGranularity] = useState<PeriodGranularity>("MONTH");
  const buckets = data[GRANULARITY_KEY[granularity]];

  const revenueData = buckets.map((b) => ({
    label: b.label,
    "This period": b.revenue,
    "Same period last year": b.priorYearRevenue,
  }));
  const workorderData = buckets.map((b) => ({
    label: b.label,
    "This period": b.workorders,
    "Same period last year": b.priorYearWorkorders,
  }));

  return (
    <div className="rounded-lg border border-border bg-bg-raised p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-text">Revenue &amp; Workorders — Year-on-Date Comparison</div>
          <div className="mt-0.5 text-xs text-text-muted">This period vs. the same period last year</div>
        </div>
        <div className="inline-flex gap-1 rounded-lg border border-border bg-bg p-1">
          {GRANULARITIES.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setGranularity(g.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                granularity === g.key ? "bg-accent text-accent-contrast" : "text-text-muted hover:text-text"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Revenue</div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} interval={0} angle={-25} textAnchor="end" height={44} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => formatCurrencyINR(Number(v))} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-raised)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--text)" }}
                  formatter={(value: number) => formatCurrencyINR(Number(value) || 0)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="This period" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Bar dataKey="Same period last year" fill="var(--border)" radius={[4, 4, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Workorders</div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workorderData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} interval={0} angle={-25} textAnchor="end" height={44} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--bg-raised)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--text)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="This period" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Bar dataKey="Same period last year" fill="var(--border)" radius={[4, 4, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
