"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { ChartCard } from "./ChartCard";

export type PieSlice = { name: string; value: number };

const SLICE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

/** Composition/breakdown chart — cycles the 4-color chart palette by index, never reassigned per-render. */
export function PieChartCard({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle?: string;
  data: PieSlice[];
}) {
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="46%"
            outerRadius="70%"
            paddingAngle={2}
          >
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={SLICE_COLORS[i % SLICE_COLORS.length]} stroke="var(--bg-raised)" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--text)",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
