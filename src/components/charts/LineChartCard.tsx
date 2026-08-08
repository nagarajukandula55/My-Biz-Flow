"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChartCard } from "./ChartCard";

export type LineSeriesPoint = { x: string; y: number };

/**
 * Trend-over-time chart. Uses the chart token palette (--chart-1..4), not
 * recharts' own defaults — see DESIGN_SYSTEM.md §5. SVG stroke/fill accept
 * CSS custom properties directly as attribute values in evergreen browsers,
 * so these tokens re-resolve automatically on theme change with no JS.
 */
export function LineChartCard({
  title,
  subtitle,
  data,
  color = "var(--chart-1)",
  valueFormatter,
}: {
  title: string;
  subtitle?: string;
  data: LineSeriesPoint[];
  color?: string;
  valueFormatter?: (v: number) => string;
}) {
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="x"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={valueFormatter}
          />
          <Tooltip
            contentStyle={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--text)",
            }}
            formatter={(value: number) => (valueFormatter ? valueFormatter(value) : value)}
          />
          <Line
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
