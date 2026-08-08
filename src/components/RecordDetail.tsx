import type { ReactNode } from "react";
import { StatusChip, type StatusVariant } from "./StatusChip";
import { formatCurrencyINR, formatDate } from "@/lib/format";

export type FieldType =
  | "text"
  | "relation"
  | "currency"
  | "date"
  | "boolean"
  | "select"
  | "multi-select"
  | "email"
  | "phone"
  | "url"
  | "percentage"
  | "color"
  | "rating"
  | "time"
  | "datetime"
  | "password"
  | "file";

export type RecordField = {
  label: string;
  value: unknown;
  type: FieldType;
  chipVariant?: StatusVariant;
};

function renderFieldValue(field: RecordField) {
  switch (field.type) {
    case "currency":
      return (
        <span className="font-mono text-base font-bold tabular-nums text-text">
          {formatCurrencyINR(Number(field.value))}
        </span>
      );
    case "date":
      return <span className="text-text">{formatDate(String(field.value))}</span>;
    case "relation":
      return <span className="font-semibold text-teal">{String(field.value)}</span>;
    case "boolean":
      return (
        <StatusChip
          label={field.value ? "Yes" : "No"}
          variant={field.value ? "success" : "neutral"}
        />
      );
    case "select":
      return <StatusChip label={String(field.value)} variant={field.chipVariant ?? "neutral"} />;
    case "multi-select": {
      const items = Array.isArray(field.value) ? (field.value as string[]) : [];
      if (items.length === 0) return <span className="text-text-muted">—</span>;
      return (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <StatusChip key={item} label={item} variant={field.chipVariant ?? "teal"} />
          ))}
        </div>
      );
    }
    case "email":
      return field.value ? (
        <a href={`mailto:${field.value}`} className="text-teal hover:underline">
          {String(field.value)}
        </a>
      ) : (
        <span className="text-text-muted">—</span>
      );
    case "phone":
      return <span className="font-mono text-text">{String(field.value ?? "—")}</span>;
    case "url":
      return field.value ? (
        <a
          href={String(field.value)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal hover:underline"
        >
          {String(field.value)}
        </a>
      ) : (
        <span className="text-text-muted">—</span>
      );
    case "percentage":
      return (
        <span className="font-mono tabular-nums text-text">
          {field.value === "" || field.value == null ? "—" : `${field.value}%`}
        </span>
      );
    case "color":
      return field.value ? (
        <span className="inline-flex items-center gap-2">
          <span
            className="h-3.5 w-3.5 rounded-full border border-border"
            style={{ background: String(field.value) }}
          />
          <span className="font-mono text-xs text-text-muted">{String(field.value)}</span>
        </span>
      ) : (
        <span className="text-text-muted">—</span>
      );
    case "rating": {
      const n = Math.min(5, Math.max(0, Math.round(Number(field.value) || 0)));
      return (
        <span aria-label={`${n} out of 5`} className="text-accent">
          {"★".repeat(n)}
          <span className="text-border">{"★".repeat(5 - n)}</span>
        </span>
      );
    }
    case "time":
    case "datetime":
      return <span className="font-mono text-text-muted">{String(field.value ?? "—")}</span>;
    case "password":
      return <span className="font-mono text-text-muted">••••••••</span>;
    case "file":
      return <span className="text-text-muted">{field.value ? String(field.value) : "—"}</span>;
    case "text":
    default:
      return <span className="text-text">{String(field.value ?? "—")}</span>;
  }
}

export type TimelineEntry = {
  id: string;
  label: string;
  timestamp: string;
  actor?: string;
};

export type RelatedRecord = {
  id: string;
  title: string;
  subtitle?: string;
};

type RecordDetailProps = {
  fields: RecordField[];
  timeline?: TimelineEntry[];
  related?: RelatedRecord[];
  headerSlot?: ReactNode;
};

export function RecordDetail({ fields, timeline, related, headerSlot }: RecordDetailProps) {
  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row">
      <div className="flex-1 space-y-6">
        {headerSlot}

        <div className="rounded-lg border border-border bg-bg-raised p-5">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.label}>
                <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {field.label}
                </div>
                <div className="mt-1">{renderFieldValue(field)}</div>
              </div>
            ))}
          </div>
        </div>

        {timeline && timeline.length > 0 && (
          <div className="rounded-lg border border-border bg-bg-raised p-5">
            <h3 className="mb-4 font-display text-base font-bold">Activity</h3>
            <ul className="space-y-4">
              {timeline.map((entry) => (
                <li key={entry.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                  <div>
                    <div className="text-text">{entry.label}</div>
                    <div className="text-xs text-text-muted">
                      {entry.actor ? `${entry.actor} · ` : ""}
                      {formatDate(entry.timestamp)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {related && related.length > 0 && (
        <div className="w-full flex-shrink-0 lg:w-72">
          <div className="rounded-lg border border-border bg-bg-raised p-5">
            <h3 className="mb-4 font-display text-base font-bold">Related records</h3>
            <ul className="space-y-3">
              {related.map((record) => (
                <li key={record.id} className="rounded-md border border-border p-3">
                  <div className="text-sm font-semibold text-teal">{record.title}</div>
                  {record.subtitle && (
                    <div className="mt-0.5 text-xs text-text-muted">{record.subtitle}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
