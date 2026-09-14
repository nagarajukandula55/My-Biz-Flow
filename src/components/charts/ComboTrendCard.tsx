"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ChartCard } from "./ChartCard";
import { formatCurrencyINR } from "@/lib/format";

export type ComboTrendPoint = { x: string; revenue: number; workorders: number };

/**
 * Combined revenue + workorder-count trend over a short recent window
 * (6 months) — revenue on the left y-axis, workorder count on the right,
 * two lines sharing one x-axis. Mirrors the reference vendor app's
 * "Revenue & Workorders Trend (last 6 months)" card.
 */
export function ComboTrendCard({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle?: string;
  data: ComboTrendPoint[];
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
            yAxisId="revenue"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={56}
            tickFormatter={(v) => formatCurrencyINR(Number(v))}
          />
          <YAxis
            yAxisId="workorders"
            orientation="right"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--text)",
            }}
            formatter={(value: number, name: string) =>
              name === "Revenue" ? formatCurrencyINR(Number(value) || 0) : value
            }
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }} />
          <Line
            yAxisId="revenue"
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--chart-1)", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="workorders"
            type="monotone"
            dataKey="workorders"
            name="Workorders"
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--chart-2)", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
