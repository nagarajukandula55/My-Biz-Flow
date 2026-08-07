export type StatusVariant = "teal" | "amber" | "success" | "warning" | "danger" | "neutral";

const VARIANT_STYLES: Record<StatusVariant, { bg: string; dot: string; text: string }> = {
  teal: { bg: "bg-teal-soft", dot: "bg-teal", text: "text-teal" },
  amber: { bg: "bg-accent-soft", dot: "bg-accent", text: "text-accent-contrast" },
  success: { bg: "bg-success-soft", dot: "bg-success", text: "text-success" },
  warning: { bg: "bg-warning-soft", dot: "bg-warning", text: "text-warning" },
  danger: { bg: "bg-danger-soft", dot: "bg-danger", text: "text-danger" },
  neutral: { bg: "bg-bg-sunken", dot: "bg-text-muted", text: "text-text-muted" },
};

type StatusChipProps = {
  label: string;
  variant?: StatusVariant;
  className?: string;
};

export function StatusChip({ label, variant = "neutral", className }: StatusChipProps) {
  const styles = VARIANT_STYLES[variant];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${styles.bg} ${styles.text} ${className ?? ""}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {label}
    </span>
  );
}
