type Trend = {
  direction: "up" | "down";
  label: string;
};

type DashboardWidgetProps = {
  label: string;
  value: string;
  trend?: Trend;
  neon?: boolean;
};

export function DashboardWidget({ label, value, trend, neon = false }: DashboardWidgetProps) {
  return (
    <div className="rounded-lg border border-border bg-bg-raised p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</div>
      <div
        className={`mt-2 font-mono text-3xl font-bold tabular-nums ${neon ? "neon-num" : "text-text"}`}
      >
        {value}
      </div>
      {trend && (
        <div
          className={`mt-2 text-xs font-semibold ${
            trend.direction === "up" ? "text-success" : "text-danger"
          }`}
        >
          {trend.direction === "up" ? "▲" : "▼"} {trend.label}
        </div>
      )}
    </div>
  );
}
