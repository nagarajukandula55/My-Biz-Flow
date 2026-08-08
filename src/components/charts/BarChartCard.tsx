"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChartCard } from "./ChartCard";

export type BarPoint = { category: string; value: number };

/** Comparison-across-categories chart — see LineChartCard for the token-color rationale. */
export function BarChartCard({
  title,
  subtitle,
  data,
  color = "var(--chart-2)",
  valueFormatter,
}: {
  title: string;
  subtitle?: string;
  data: BarPoint[];
  color?: string;
  valueFormatter?: (v: number) => string;
}) {
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="category"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={48}
          />
          <YAxis
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={valueFormatter}
          />
          <Tooltip
            cursor={{ fill: "var(--bg-sunken)" }}
            contentStyle={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--text)",
            }}
            formatter={(value: number) => (valueFormatter ? valueFormatter(value) : value)}
          />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
