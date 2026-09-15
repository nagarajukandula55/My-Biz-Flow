import type { ReactNode } from "react";

const TONE_CLASSES: Record<"success" | "warning" | "danger" | "info", string> = {
  success: "border-success/40 bg-success-soft text-success",
  warning: "border-warning/40 bg-warning-soft text-warning",
  danger: "border-danger/40 bg-danger/5 text-danger",
  info: "border-border bg-bg-raised text-text",
};

/**
 * A prominent, self-contained status card — distinct from the small inline
 * "Connected"/"Sent" labels already used throughout (those stay, this is
 * for the "does this thing actually work" summary a partner should see
 * without having to parse row-level chips).
 */
export function NoticeCard({
  tone,
  title,
  children,
}: {
  tone: "success" | "warning" | "danger" | "info";
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={`rounded-lg border p-4 ${TONE_CLASSES[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      {children && <div className="mt-1 text-xs opacity-90">{children}</div>}
    </div>
  );
}
