import type { ReactNode } from "react";

/**
 * Shared card shell for every chart type — same bordered/raised treatment
 * as DashboardWidget, so charts read as part of one system rather than a
 * bolted-on library's default look. Fixed height so ResponsiveContainer
 * (used by every chart below) has something concrete to measure against.
 */
export function ChartCard({
  title,
  subtitle,
  children,
  height = 280,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  height?: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-raised p-5">
      <div className="text-sm font-semibold text-text">{title}</div>
      {subtitle && <div className="mt-0.5 text-xs text-text-muted">{subtitle}</div>}
      <div className="mt-4" style={{ height }}>
        {children}
      </div>
    </div>
  );
}
